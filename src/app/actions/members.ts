"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PropertyRole } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireProperty } from "@/lib/ownership";
import { getAppUrl } from "@/lib/app-url";
import { inviteExpiry, isAssignableRole } from "@/lib/property-members";
import { buildPropertyInviteEmail } from "@/lib/invite-email";
import { sendEmail } from "@/server/emails/send";

const propertyPath = (id: string) => `/properties/${id}`;

function flash(propertyId: string, params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`${propertyPath(propertyId)}?${qs}`);
}

const inviteSchema = z.object({
  propertyId: z.string().min(1),
  email: z.string().email(),
  role: z.string().refine(isAssignableRole, "Invalid role"),
});

/**
 * Sends the invite email. Returns true on success, false if delivery failed (e.g.
 * the sending domain isn't verified in Resend yet). Never throws — a delivery
 * failure must not lose the invite, which already exists in the database. The
 * owner can copy the link from the UI or resend once email is configured.
 */
async function sendInviteEmail(params: {
  to: string;
  inviterName: string;
  propertyName: string;
  role: PropertyRole;
  token: string;
}): Promise<boolean> {
  const acceptUrl = `${getAppUrl()}/invite/${params.token}`;
  const email = buildPropertyInviteEmail({
    inviterName: params.inviterName,
    propertyName: params.propertyName,
    role: params.role,
    acceptUrl,
  });

  try {
    await sendEmail({
      to: params.to,
      subject: email.subject,
      body: email.text,
      html: email.html,
    });
    return true;
  } catch (err) {
    console.error("Property invite email failed to send:", err);
    return false;
  }
}

export async function inviteMemberAction(formData: FormData) {
  const user = await requireUser();
  const parsed = inviteSchema.safeParse({
    propertyId: formData.get("propertyId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    const propertyId = String(formData.get("propertyId") ?? "");
    flash(propertyId, { error: "invite_invalid" });
  }
  const { propertyId, role } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const property = await requireProperty(user.id, propertyId, "OWNER");

  // Reject inviting someone who is already a member.
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    const alreadyMember = await prisma.propertyMember.findUnique({
      where: { propertyId_userId: { propertyId, userId: existingUser.id } },
      select: { id: true },
    });
    if (alreadyMember) {
      flash(propertyId, { error: "already_member" });
    }
  }

  const invite = await prisma.propertyInvite.upsert({
    where: { propertyId_email: { propertyId, email } },
    create: {
      propertyId,
      email,
      role: role as PropertyRole,
      invitedById: user.id,
      expiresAt: inviteExpiry(),
    },
    update: {
      role: role as PropertyRole,
      invitedById: user.id,
      status: "PENDING",
      token: undefined, // keep existing token on re-invite
      expiresAt: inviteExpiry(),
      acceptedAt: null,
    },
  });

  const emailed = await sendInviteEmail({
    to: email,
    inviterName: user.name || user.email,
    propertyName: property.name,
    role: invite.role,
    token: invite.token,
  });

  revalidatePath(propertyPath(propertyId));
  flash(propertyId, { saved: emailed ? "invited" : "invited_no_email" });
}

export async function resendInviteAction(formData: FormData) {
  const user = await requireUser();
  const inviteId = String(formData.get("inviteId") ?? "");
  const invite = await prisma.propertyInvite.findUnique({ where: { id: inviteId } });
  if (!invite) redirect("/properties");

  const property = await requireProperty(user.id, invite.propertyId, "OWNER");

  const updated = await prisma.propertyInvite.update({
    where: { id: inviteId },
    data: { status: "PENDING", expiresAt: inviteExpiry(), acceptedAt: null },
  });

  const emailed = await sendInviteEmail({
    to: updated.email,
    inviterName: user.name || user.email,
    propertyName: property.name,
    role: updated.role,
    token: updated.token,
  });

  flash(invite.propertyId, { saved: emailed ? "invite_resent" : "invited_no_email" });
}

export async function revokeInviteAction(formData: FormData) {
  const user = await requireUser();
  const inviteId = String(formData.get("inviteId") ?? "");
  const invite = await prisma.propertyInvite.findUnique({ where: { id: inviteId } });
  if (!invite) redirect("/properties");

  await requireProperty(user.id, invite.propertyId, "OWNER");

  await prisma.propertyInvite.update({
    where: { id: inviteId },
    data: { status: "REVOKED" },
  });

  revalidatePath(propertyPath(invite.propertyId));
  flash(invite.propertyId, { saved: "invite_revoked" });
}

const roleChangeSchema = z.object({
  propertyId: z.string().min(1),
  memberId: z.string().min(1),
  role: z.string().refine(isAssignableRole, "Invalid role"),
});

export async function changeMemberRoleAction(formData: FormData) {
  const user = await requireUser();
  const parsed = roleChangeSchema.safeParse({
    propertyId: formData.get("propertyId"),
    memberId: formData.get("memberId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    flash(String(formData.get("propertyId") ?? ""), { error: "role_invalid" });
  }
  const { propertyId, memberId, role } = parsed.data;

  await requireProperty(user.id, propertyId, "OWNER");

  const member = await prisma.propertyMember.findFirst({
    where: { id: memberId, propertyId },
  });
  if (!member) flash(propertyId, { error: "member_not_found" });

  // Cannot demote the last remaining owner.
  if (member!.role === "OWNER" && role !== "OWNER") {
    const ownerCount = await prisma.propertyMember.count({
      where: { propertyId, role: "OWNER" },
    });
    if (ownerCount <= 1) flash(propertyId, { error: "last_owner" });
  }

  await prisma.propertyMember.update({
    where: { id: memberId },
    data: { role: role as PropertyRole },
  });

  revalidatePath(propertyPath(propertyId));
  flash(propertyId, { saved: "role_updated" });
}

export async function removeMemberAction(formData: FormData) {
  const user = await requireUser();
  const propertyId = String(formData.get("propertyId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  await requireProperty(user.id, propertyId, "OWNER");

  const member = await prisma.propertyMember.findFirst({
    where: { id: memberId, propertyId },
  });
  if (!member) flash(propertyId, { error: "member_not_found" });

  if (member!.role === "OWNER") {
    const ownerCount = await prisma.propertyMember.count({
      where: { propertyId, role: "OWNER" },
    });
    if (ownerCount <= 1) flash(propertyId, { error: "last_owner" });
  }

  await prisma.propertyMember.delete({ where: { id: memberId } });

  revalidatePath(propertyPath(propertyId));
  flash(propertyId, { saved: "member_removed" });
}

export async function leavePropertyAction(formData: FormData) {
  const user = await requireUser();
  const propertyId = String(formData.get("propertyId") ?? "");

  // Must be a member to leave.
  await requireProperty(user.id, propertyId, "VIEWER");

  const member = await prisma.propertyMember.findUnique({
    where: { propertyId_userId: { propertyId, userId: user.id } },
  });
  if (!member) redirect("/properties");

  if (member.role === "OWNER") {
    const ownerCount = await prisma.propertyMember.count({
      where: { propertyId, role: "OWNER" },
    });
    if (ownerCount <= 1) flash(propertyId, { error: "last_owner_leave" });
  }

  await prisma.propertyMember.delete({ where: { id: member.id } });

  revalidatePath("/properties");
  redirect("/properties?left=1");
}

/**
 * Form action: accept the invite for the currently signed-in user. Redirects to
 * the property on success, or back to the invite page with an error otherwise.
 */
export async function acceptInviteAction(formData: FormData) {
  const user = await requireUser();
  const token = String(formData.get("token") ?? "");
  const result = await acceptInvite(token, user.id, user.email);
  if (result.ok) {
    redirect(`/properties/${result.propertyId}?joined=1`);
  }
  redirect(`/invite/${token}?error=${result.reason}`);
}

/**
 * Accept an invite by token for the given authenticated user. Returns the
 * propertyId on success, or an error code. Used by the /invite/[token] flow
 * once the visitor is signed in with the matching email.
 */
export async function acceptInvite(
  token: string,
  userId: string,
  userEmail: string
): Promise<{ ok: true; propertyId: string } | { ok: false; reason: string }> {
  const invite = await prisma.propertyInvite.findUnique({ where: { token } });
  if (!invite) return { ok: false, reason: "not_found" };
  if (invite.status === "ACCEPTED") return { ok: true, propertyId: invite.propertyId };
  if (invite.status !== "PENDING") return { ok: false, reason: "revoked" };
  if (invite.expiresAt < new Date()) {
    await prisma.propertyInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    return { ok: false, reason: "expired" };
  }
  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    return { ok: false, reason: "email_mismatch" };
  }

  await prisma.$transaction([
    prisma.propertyMember.upsert({
      where: { propertyId_userId: { propertyId: invite.propertyId, userId } },
      create: { propertyId: invite.propertyId, userId, role: invite.role },
      update: { role: invite.role },
    }),
    prisma.propertyInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    }),
  ]);

  revalidatePath("/properties");
  return { ok: true, propertyId: invite.propertyId };
}
