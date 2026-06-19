import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import { createAccountLink } from "@/lib/stripe";

/**
 * Stripe Connect onboarding refresh URL. Hit when an Account Link expires before
 * the landlord finishes. We mint a fresh link and bounce them back into onboarding.
 */
export async function GET() {
  const base = getAppUrl();
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.redirect(`${base}/sign-in`);
  }

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings?.stripeConnectAccountId) {
    return NextResponse.redirect(`${base}/settings/integrations`);
  }

  try {
    const url = await createAccountLink({
      accountId: settings.stripeConnectAccountId,
      returnUrl: `${base}/api/stripe/connect/return`,
      refreshUrl: `${base}/api/stripe/connect/refresh`,
    });
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(`${base}/settings/integrations?error=stripe_unavailable`);
  }
}
