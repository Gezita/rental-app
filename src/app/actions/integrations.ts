"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import {
  isStripeConfigured,
  createConnectAccount,
  createAccountLink,
  createLoginLink,
  getAccountStatus,
} from "@/lib/stripe";

/** Toggle whether Stripe pay links appear on statements. Only effective once the
 * connected account can accept charges. */
export async function setStripePaymentsAction(formData: FormData) {
  const user = await requireUser();
  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
  const wantsPayments = formData.get("stripePaymentsEnabled") === "on";
  const stripePaymentsEnabled = wantsPayments && Boolean(settings?.stripeChargesEnabled);

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, stripePaymentsEnabled },
    update: { stripePaymentsEnabled },
  });

  revalidatePath("/settings/integrations");
  revalidatePath("/settings");
  redirect("/settings/integrations?saved=1");
}

/** Toggle DocuSign on lease completion. */
export async function setDocusignAction(formData: FormData) {
  const user = await requireUser();
  const docusignEnabled = formData.get("docusignEnabled") === "on";

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, docusignEnabled },
    update: { docusignEnabled },
  });

  revalidatePath("/settings/integrations");
  revalidatePath("/settings");
  redirect("/settings/integrations?saved=1");
}

/**
 * Starts (or resumes) Stripe Connect onboarding: ensures the landlord has an
 * Express connected account, then redirects them to Stripe's hosted onboarding.
 */
export async function connectStripeAction() {
  const user = await requireUser();
  if (!isStripeConfigured()) {
    redirect("/settings/integrations?error=stripe_unavailable");
  }

  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
  let accountId = settings?.stripeConnectAccountId ?? null;

  if (!accountId) {
    accountId = await createConnectAccount({ email: user.email, userId: user.id });
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, stripeConnectAccountId: accountId },
      update: { stripeConnectAccountId: accountId },
    });
  }

  const base = getAppUrl();
  const url = await createAccountLink({
    accountId,
    returnUrl: `${base}/api/stripe/connect/return`,
    refreshUrl: `${base}/api/stripe/connect/refresh`,
  });
  redirect(url);
}

/** Re-fetches the connected account's status and mirrors it onto settings. */
export async function refreshStripeStatusAction() {
  const user = await requireUser();
  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
  if (!settings?.stripeConnectAccountId) {
    redirect("/settings/integrations");
  }

  await syncConnectStatus(user.id, settings.stripeConnectAccountId);
  revalidatePath("/settings/integrations");
  redirect("/settings/integrations?saved=stripe_status");
}

/** Redirects the landlord to their Stripe Express dashboard. */
export async function stripeDashboardAction() {
  const user = await requireUser();
  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
  if (!settings?.stripeConnectAccountId) {
    redirect("/settings/integrations");
  }
  const url = await createLoginLink(settings.stripeConnectAccountId);
  redirect(url);
}

/**
 * Shared helper: pull live status from Stripe and write it onto UserSettings.
 * Also auto-disables payments if the account can no longer charge.
 */
export async function syncConnectStatus(userId: string, accountId: string) {
  const status = await getAccountStatus(accountId);
  await prisma.userSettings.update({
    where: { userId },
    data: {
      stripeChargesEnabled: status.chargesEnabled,
      stripePayoutsEnabled: status.payoutsEnabled,
      stripeOnboardedAt: status.detailsSubmitted ? new Date() : null,
      ...(status.chargesEnabled ? {} : { stripePaymentsEnabled: false }),
    },
  });
  return status;
}
