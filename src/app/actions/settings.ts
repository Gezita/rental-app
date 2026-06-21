"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, setSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isLocked, recordFailure, clearAttempts } from "@/lib/rate-limit";
import { zCheckbox, zOptionalString } from "@/lib/validation";

// ── Schemas ──────────────────────────────────────────────────────────────────

const PASSWORD_MIN_LENGTH = 12;

const updateSettingsSchema = z.object({
  landlordName: z.string().trim().min(1, "Landlord name is required"),
  paymentInstructions: zOptionalString,
  statementNotes: zOptionalString,
  autoSendStatements: zCheckbox,
  autoSendDayOfMonth: z.preprocess(
    (v) => parseInt(String(v ?? 1), 10),
    z.number().int().transform((n) => Math.min(28, Math.max(1, n)))
  ),
  leaseReminderDays: z.preprocess(
    (v) => parseInt(String(v ?? 30), 10),
    z.number().int().transform((n) => Math.min(365, Math.max(7, n)))
  ),
  stripePaymentsEnabled: zCheckbox,
});

const updateProfileSchema = z.object({
  name: zOptionalString,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LENGTH)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
  confirmPassword: z.string().min(1),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ["confirmPassword"],
});

// ── Actions ───────────────────────────────────────────────────────────────────

export async function updateSettingsAction(formData: FormData) {
  const user = await requireUser();

  const parsed = updateSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/settings?error=invalid");

  const {
    landlordName,
    paymentInstructions,
    statementNotes,
    autoSendStatements,
    autoSendDayOfMonth,
    leaseReminderDays,
    stripePaymentsEnabled,
  } = parsed.data;

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      landlordName,
      paymentInstructions: paymentInstructions ?? "",
      statementNotes: statementNotes ?? "",
      autoSendStatements,
      autoSendDayOfMonth,
      leaseReminderDays,
      stripePaymentsEnabled,
    },
    update: {
      landlordName,
      paymentInstructions: paymentInstructions ?? "",
      statementNotes: statementNotes ?? "",
      autoSendStatements,
      autoSendDayOfMonth,
      leaseReminderDays,
      stripePaymentsEnabled,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?saved=1");
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();

  const parsed = updateProfileSchema.safeParse(Object.fromEntries(formData));
  const name = parsed.success ? parsed.data.name : undefined;

  await prisma.user.update({
    where: { id: user.id },
    data: { name: name ?? null },
  });

  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
  redirect("/settings/profile?saved=1");
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/settings/security?error=invalid");

  if (!user.password) redirect("/settings/security?error=google_only");

  const attemptKey = `password-change:${user.id}`;
  if (await isLocked(attemptKey)) redirect("/settings/security?error=locked");

  const { currentPassword, newPassword } = parsed.data;
  const currentPasswordMatches = await bcrypt.compare(currentPassword, user.password);
  if (!currentPasswordMatches) {
    await recordFailure(attemptKey);
    redirect("/settings/security?error=current");
  }

  const isReusedPassword = await bcrypt.compare(newPassword, user.password);
  if (isReusedPassword) redirect("/settings/security?error=reused");

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  await clearAttempts(attemptKey);
  await setSession(user.id);
  revalidatePath("/settings/security");
  redirect("/settings/security?saved=password");
}
