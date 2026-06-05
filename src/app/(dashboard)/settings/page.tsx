import { runAutoBillingAction, updateSettingsAction } from "@/app/actions/app";
import { requireUser } from "@/lib/auth";
import { isStripeConfigured } from "@/lib/stripe";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { FlashAlert } from "@/components/flash-alert";
import { SubmitButton } from "@/components/submit-button";
import {
  Alert,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@/components/ui";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    autoBilling?: string;
    generated?: string;
    sent?: string;
    skipped?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const settings = user.settings;
  const stripeConfigured = isStripeConfigured();
  const runAutoBilling = runAutoBillingAction;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageBackNav />
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted">Billing automation, payments, and reminders</p>
      </div>

      {params.saved && (
        <FlashAlert clearParams={["saved"]}>Saved settings.</FlashAlert>
      )}
      {params.autoBilling && (
        <FlashAlert clearParams={["autoBilling", "generated", "sent", "skipped"]}>
          Auto-billing run: {params.generated ?? 0} statement(s) generated, {params.sent ?? 0}{" "}
          sent, {params.skipped ?? 0} skipped (missing tenant email).
        </FlashAlert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Email: {user.email}</p>
          <p>Name: {user.name || "—"}</p>
        </CardContent>
      </Card>

      <form action={updateSettingsAction} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Statement & Receipt Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="landlordName">Landlord / Business Name</Label>
              <Input
                id="landlordName"
                name="landlordName"
                defaultValue={settings?.landlordName || user.name || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentInstructions">Payment Instructions</Label>
              <Textarea
                id="paymentInstructions"
                name="paymentInstructions"
                defaultValue={settings?.paymentInstructions || ""}
                placeholder="E-transfer to..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="statementNotes">Default Statement Notes</Label>
              <Textarea
                id="statementNotes"
                name="statementNotes"
                defaultValue={settings?.statementNotes || ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automatic Invoice Sender</CardTitle>
            <CardDescription>
              On the 1st of each month (or your chosen day), generates statements for all
              properties and emails tenants who have an email on file using a professional HTML
              layout with the statement PDF attached.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="autoSendStatements"
                defaultChecked={settings?.autoSendStatements}
                className="h-4 w-4 rounded border-border"
              />
              Enable automatic monthly statements
            </label>
            <div className="space-y-2">
              <Label htmlFor="autoSendDayOfMonth">Send on day of month (1–28)</Label>
              <Input
                id="autoSendDayOfMonth"
                name="autoSendDayOfMonth"
                type="number"
                min={1}
                max={28}
                defaultValue={settings?.autoSendDayOfMonth ?? 1}
              />
            </div>
            <p className="text-xs text-muted">
              Schedule a daily cron POST to{" "}
              <code className="rounded bg-surface-muted px-1">/api/cron/auto-billing</code> with header{" "}
              <code className="rounded bg-surface-muted px-1">Authorization: Bearer CRON_SECRET</code>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lease End Reminders</CardTitle>
            <CardDescription>
              Show leases ending soon on your dashboard. Set a lease end date when uploading a
              lease on a unit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="leaseReminderDays">Remind me this many days before lease ends</Label>
              <Input
                id="leaseReminderDays"
                name="leaseReminderDays"
                type="number"
                min={7}
                max={365}
                defaultValue={settings?.leaseReminderDays ?? 30}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stripe Online Payments</CardTitle>
            <CardDescription>
              Tenants pay via a secure link included in statement emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="stripePaymentsEnabled"
                defaultChecked={settings?.stripePaymentsEnabled}
                disabled={!stripeConfigured}
                className="h-4 w-4 rounded border-border"
              />
              Enable Stripe card payments for tenants
            </label>
            {!stripeConfigured && (
              <Alert variant="warning">
                Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and NEXT_PUBLIC_APP_URL to your
                environment to enable Stripe.
              </Alert>
            )}
            {stripeConfigured && (
              <p className="text-xs text-muted">
                Webhook endpoint: <code className="rounded bg-surface-muted px-1">/api/stripe/webhook</code>
              </p>
            )}
          </CardContent>
        </Card>

        <SubmitButton pendingLabel="Saving…">Save Settings</SubmitButton>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Test Auto-Billing</CardTitle>
          <CardDescription>
            Run generate + send now, regardless of the day-of-month setting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={runAutoBilling}>
            <SubmitButton variant="outline" pendingLabel="Running…">
              Run auto-billing now
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
