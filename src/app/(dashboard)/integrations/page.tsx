import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isDocuSignConfigured, isStripeIntegrationConfigured } from "@/lib/docusign";
import { isStripeConfigured } from "@/lib/stripe";
import { updateIntegrationsAction } from "@/app/actions/integrations";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { PageHeader } from "@/components/dashboard/page-header";
import { FlashAlert } from "@/components/flash-alert";
import { SubmitButton } from "@/components/submit-button";
import {
  Badge,
  Button,
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
  const stripeEnvConfigured = isStripeIntegrationConfigured();
  const stripeReady = isStripeConfigured();
  const docusignEnvConfigured = isDocuSignConfigured();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageBackNav />
      <PageHeader
        title="Integrations"
        description="Connect payment and e-signature platforms. More integrations coming soon."
      />

      {params.saved && <FlashAlert clearParams={["saved"]}>Integration settings saved.</FlashAlert>}
      {params.error === "lease_not_found" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Lease document not found.
        </FlashAlert>
      )}

      <form action={updateIntegrationsAction} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Stripe</CardTitle>
                <CardDescription>
                  Online rent payments from tenant statement pay links.
                </CardDescription>
              </div>
              <Badge variant={stripeReady ? "success" : stripeEnvConfigured ? "warning" : "secondary"}>
                {stripeReady ? "Connected" : stripeEnvConfigured ? "Keys set" : "Not configured"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">
              Add <code className="text-xs">STRIPE_SECRET_KEY</code> and{" "}
              <code className="text-xs">STRIPE_WEBHOOK_SECRET</code> to your environment, then
              enable payments below.
            </p>
            <div className="flex items-center gap-2">
              <input
                id="stripePaymentsEnabled"
                name="stripePaymentsEnabled"
                type="checkbox"
                defaultChecked={settings?.stripePaymentsEnabled}
                disabled={!stripeEnvConfigured}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="stripePaymentsEnabled" className="font-normal">
                Enable Stripe payments in statements
              </Label>
            </div>
            <Link href="/settings">
              <Button type="button" variant="outline" size="sm">
                Open billing settings
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>DocuSign</CardTitle>
                <CardDescription>
                  Send Ontario Standard Leases for landlord and tenant e-signature.
                </CardDescription>
              </div>
              <Badge
                variant={
                  settings?.docusignEnabled && docusignEnvConfigured ? "success" : "secondary"
                }
              >
                {settings?.docusignEnabled && docusignEnvConfigured ? "Ready" : "Not connected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">
              Set{" "}
              <code className="text-xs">DOCUSIGN_INTEGRATION_KEY</code>,{" "}
              <code className="text-xs">DOCUSIGN_ACCOUNT_ID</code>,{" "}
              <code className="text-xs">DOCUSIGN_USER_ID</code>, and{" "}
              <code className="text-xs">DOCUSIGN_PRIVATE_KEY</code> in your environment. Signed
              leases appear on the unit page when signing completes.
            </p>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coming soon</CardTitle>
            <CardDescription>Additional platform sync options planned for Zigglo.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted">
              <li>QuickBooks / accounting export sync</li>
              <li>Google Drive document backup</li>
              <li>Utility provider bill import APIs</li>
            </ul>
          </CardContent>
        </Card>

        <SubmitButton pendingLabel="Saving…">Save integration settings</SubmitButton>
      </form>
    </div>
  );
}
