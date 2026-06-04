import {
  runAutoBillingAction,
  syncAllGreenButtonAction,
  updateSettingsAction,
} from "@/app/actions/app";
import { requireUser } from "@/lib/auth";
import { isGreenButtonConfigured } from "@/lib/green-button/providers";
import { isStripeConfigured } from "@/lib/stripe";
import { PageBackNav } from "@/components/layout/page-back-nav";
import {
  Alert,
  Button,
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
    greenButton?: string;
    reason?: string;
    greenButtonSync?: string;
    imported?: string;
    connections?: string;
    error?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const settings = user.settings;
  const stripeConfigured = isStripeConfigured();
  const greenButtonConfigured = isGreenButtonConfigured();
  const runAutoBilling = runAutoBillingAction;
  const syncAllGreenButton = syncAllGreenButtonAction;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageBackNav />
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-slate-500">Billing automation, payments, and reminders</p>
      </div>

      {params.saved && <Alert>Saved settings.</Alert>}
      {params.autoBilling && (
        <Alert>
          Auto-billing run: {params.generated ?? 0} statement(s) generated, {params.sent ?? 0}{" "}
          sent, {params.skipped ?? 0} skipped (missing tenant email).
        </Alert>
      )}
      {params.greenButton === "error" && (
        <Alert variant="error">
          Green Button authorization failed{params.reason ? `: ${params.reason}` : "."}
        </Alert>
      )}
      {params.greenButtonSync && (
        <Alert>
          Green Button sync: {params.imported ?? 0} bill(s) imported across{" "}
          {params.connections ?? 0} connection(s), {params.skipped ?? 0} skipped.
          {params.error ? ` Error: ${params.error}` : ""}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
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
                className="h-4 w-4 rounded border-slate-300"
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
            <p className="text-xs text-slate-500">
              Schedule a daily cron POST to{" "}
              <code className="rounded bg-slate-100 px-1">/api/cron/auto-billing</code> with header{" "}
              <code className="rounded bg-slate-100 px-1">Authorization: Bearer CRON_SECRET</code>
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
                className="h-4 w-4 rounded border-slate-300"
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
              <p className="text-xs text-slate-500">
                Webhook endpoint: <code className="rounded bg-slate-100 px-1">/api/stripe/webhook</code>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utility Automation (Green Button)</CardTitle>
            <CardDescription>
              Automatically import utility bills from connected Enbridge, Alectra, or sandbox
              accounts. Connect accounts on each property&apos;s Green Button page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="utilityAutomationEnabled"
                defaultChecked={settings?.utilityAutomationEnabled}
                className="h-4 w-4 rounded border-slate-300"
              />
              Enable scheduled Green Button bill sync
            </label>
            {!greenButtonConfigured && (
              <Alert variant="warning">
                Configure Green Button credentials in your environment. The sandbox provider works
                with default values for testing.
              </Alert>
            )}
            <p className="text-xs text-slate-500">
              Schedule a daily cron POST to{" "}
              <code className="rounded bg-slate-100 px-1">/api/cron/green-button-sync</code> with
              header <code className="rounded bg-slate-100 px-1">Authorization: Bearer CRON_SECRET</code>
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit">Save Settings</Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Green Button Sync</CardTitle>
          <CardDescription>
            Import the latest bills from all connected utility accounts now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={syncAllGreenButton}>
            <Button type="submit" variant="outline">
              Sync Green Button bills now
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Auto-Billing</CardTitle>
          <CardDescription>
            Run generate + send now, regardless of the day-of-month setting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={runAutoBilling}>
            <Button type="submit" variant="outline">
              Run auto-billing now
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
