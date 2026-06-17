"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { assertCloudDataAllowed } from "@/lib/cloud-guard";
import { getAppUrl } from "@/lib/app-url";
import { clearTenantSession } from "@/lib/tenant-auth";
import { buildTenantMagicLinkEmailContent } from "@/lib/tenant-communications";
import { createTenantMagicLink, findActiveTenantByEmail } from "@/lib/tenant-magic-link";
import { isLocked, clearAttempts } from "@/lib/rate-limit";
import { sendEmail } from "@/server/emails/send";
import { zEmail } from "@/lib/validation";
import { getTenantDisplayName, getTenantLandlordName } from "@/lib/tenant-auth";

const requestMagicLinkSchema = z.object({
  email: zEmail,
});

export async function requestTenantMagicLinkAction(formData: FormData) {
  assertCloudDataAllowed();
  const parsed = requestMagicLinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/tenant/sign-in?error=invalid");

  const email = parsed.data.email.toLowerCase();
  const rateLimitKey = `tenant:${email}`;

  if (await isLocked(rateLimitKey)) {
    redirect("/tenant/sign-in?error=locked");
  }

  const tenant = await findActiveTenantByEmail(email);

  if (!tenant?.email) {
    redirect("/tenant/sign-in?sent=1");
  }

  const { rawToken } = await createTenantMagicLink(tenant.id);
  const magicLinkUrl = `${getAppUrl()}/api/tenant/auth/verify?token=${rawToken}`;
  const landlordName = getTenantLandlordName(tenant);
  const emailContent = buildTenantMagicLinkEmailContent({
    tenantName: getTenantDisplayName(tenant),
    unitName: tenant.unit.name,
    propertyName: tenant.unit.property.name,
    magicLinkUrl,
    landlordName,
  });

  try {
    await sendEmail({
      to: tenant.email,
      subject: emailContent.subject,
      body: emailContent.text,
      html: emailContent.html,
    });
  } catch {
    redirect("/tenant/sign-in?error=send");
  }

  await clearAttempts(rateLimitKey);
  redirect("/tenant/sign-in?sent=1");
}

export async function signOutTenantAction() {
  assertCloudDataAllowed();
  await clearTenantSession();
  redirect("/tenant/sign-in");
}
