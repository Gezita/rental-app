import { requireUser } from "@/lib/auth";
import { isDocuSignConfigured } from "@/lib/docusign";
import { isStripeConfigured } from "@/lib/stripe";
import {
  setStripePaymentsAction,
  setDocusignAction,
  connectStripeAction,
  refreshStripeStatusAction,
  stripeDashboardAction,
} from "@/app/actions/integrations";
import { PageHeader } from "@/components/dashboard/page-header";
import { FlashAlert } from "@/components/flash-alert";
import { SubmitButton } from "@/components/submit-button";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
} from "@/components/ui";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const settings = user.settings;

  // The platform Stripe key is the one remaining (legitimately operator-level)
  // env var. With it set, landlords self-onboard via Stripe Connect — no keys.
  const stripePlatformReady = isStripeConfigured();
  const hasConnectAccount = Boolean(settings?.stripeConnectAccountId);
  const chargesEnabled = Boolean(settings?.stripeChargesEnabled);
  const onboardingStarted = hasConnectAccount && !chargesEnabled;

  const docusignEnvConfigured = isDocuSignConfigured();

  const stripeBadge = chargesEnabled
    ? { variant: "success" as const, label: "Connected" }
    : onboardingStarted
      ? { variant: "warning" as const, label: "Finish setup" }
      : { variant: "secondary" as const, label: "Not connected" };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect payment and e-signature platforms. More integrations coming soon."
      />

      {params.saved === "stripe_connected" && (
        <FlashAlert clearParams={["saved"]}>
          Stripe onboarding updated. If anything is still pending, finish it on Stripe and refresh
          your status.
        </FlashAlert>
      )}
      {params.saved === "stripe_status" && (
        <FlashAlert clearParams={["saved"]}>Stripe status refreshed.</FlashAlert>
      )}
      {params.saved && !["stripe_connected", "stripe_status"].includes(params.saved) && (
        <FlashAlert clearParams={["saved"]}>Integration settings saved.</FlashAlert>
      )}
      {params.error === "stripe_unavailable" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Online payments aren&apos;t available on this deployment yet.
        </FlashAlert>
      )}
      {params.error === "stripe_status" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Couldn&apos;t reach Stripe to refresh your status. Try again in a moment.
        </FlashAlert>
      )}
      {params.error === "lease_not_found" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Lease document not found.
        </FlashAlert>
      )}

      {/* ── Stripe ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Stripe</CardTitle>
              <CardDescription>
                Collect rent online. Tenant payments go straight to your own bank account.
              </CardDescription>
            </div>
            <Badge variant={stripeBadge.variant}>{stripeBadge.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!stripePlatformReady ? (
            <p className="text-sm text-warning">
              Online payments aren&apos;t enabled on this deployment yet. Once the operator
              configures Stripe, you&apos;ll be able to connect your account here.
            </p>
          ) : !hasConnectAccount ? (
            <>
              <p className="text-sm text-muted">
                Connect your Stripe account to accept rent payments. Stripe handles the signup,
                identity verification, and payouts to your bank — it takes a few minutes and you
                won&apos;t need any API keys.
              </p>
              <form action={connectStripeAction}>
                <SubmitButton pendingLabel="Redirecting to Stripe…">
                  Connect with Stripe
                </SubmitButton>
              </form>
            </>
          ) : onboardingStarted ? (
            <>
              <p className="text-sm text-muted">
                Your Stripe onboarding isn&apos;t finished yet. Complete the remaining steps on
                Stripe, then refresh your status.
              </p>
              <div className="flex flex-wrap gap-2">
                <form action={connectStripeAction}>
                  <SubmitButton pendingLabel="Redirecting to Stripe…">
                    Finish Stripe setup
                  </SubmitButton>
                </form>
                <form action={refreshStripeStatusAction}>
                  <SubmitButton variant="outline" pendingLabel="Refreshing…">
                    Refresh status
                  </SubmitButton>
                </form>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-success">
                Your Stripe account is connected and ready to accept payments. Payouts go to your
                own bank account.
              </p>
              <div className="flex flex-wrap gap-2">
                <form action={stripeDashboardAction}>
                  <SubmitButton variant="outline" pendingLabel="Opening Stripe…">
                    Manage on Stripe
                  </SubmitButton>
                </form>
                <form action={refreshStripeStatusAction}>
                  <SubmitButton variant="outline" pendingLabel="Refreshing…">
                    Refresh status
                  </SubmitButton>
                </form>
              </div>

              <form action={setStripePaymentsAction} className="border-t border-border-subtle pt-4">
                <div className="flex items-center gap-2">
                  <input
                    id="stripePaymentsEnabled"
                    name="stripePaymentsEnabled"
                    type="checkbox"
                    defaultChecked={settings?.stripePaymentsEnabled}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="stripePaymentsEnabled" className="font-normal">
                    Show a “Pay online” link on tenant statements
                  </Label>
                </div>
                <div className="mt-3">
                  <SubmitButton variant="outline" pendingLabel="Saving…">
                    Save
                  </SubmitButton>
                </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── DocuSign ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>DocuSign</CardTitle>
              <CardDescription>
                Send Ontario Standard Leases for landlord and tenant e-signature.
              </CardDescription>
            </div>
            <Badge variant={settings?.docusignEnabled && docusignEnvConfigured ? "success" : "secondary"}>
              {settings?.docusignEnabled && docusignEnvConfigured ? "Ready" : "Not connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={setDocusignAction} className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                id="docusignEnabled"
                name="docusignEnabled"
                type="checkbox"
                defaultChecked={settings?.docusignEnabled}
                disabled={!docusignEnvConfigured}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="docusignEnabled" className="font-normal">
                Enable DocuSign on lease completion
              </Label>
            </div>
            {!docusignEnvConfigured && (
              <p className="text-xs text-warning">
                DocuSign API credentials are not in your environment yet. You can still generate
                lease PDFs and upload signed copies manually.
              </p>
            )}
            <SubmitButton variant="outline" pendingLabel="Saving…">
              Save
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      {/* ── Coming soon ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>Additional platform sync options planned for Lessora.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted">
            <li>QuickBooks / accounting export sync</li>
            <li>Google Drive document backup</li>
            <li>Utility provider bill import APIs</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
