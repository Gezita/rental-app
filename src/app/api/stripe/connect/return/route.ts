import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import { syncConnectStatus } from "@/app/actions/integrations";

/**
 * Stripe Connect onboarding return URL. The landlord lands here after completing
 * (or exiting) Stripe's hosted onboarding. We refresh their account status and
 * send them back to the Integrations page.
 */
export async function GET() {
  const base = getAppUrl();
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.redirect(`${base}/sign-in`);
  }

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (settings?.stripeConnectAccountId) {
    try {
      await syncConnectStatus(userId, settings.stripeConnectAccountId);
    } catch {
      return NextResponse.redirect(`${base}/settings/integrations?error=stripe_status`);
    }
  }

  return NextResponse.redirect(`${base}/settings/integrations?saved=stripe_connected`);
}
