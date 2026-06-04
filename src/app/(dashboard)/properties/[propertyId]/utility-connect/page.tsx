import Link from "next/link";
import { notFound } from "next/navigation";
import {
  connectGreenButtonManualAction,
  disconnectGreenButtonAction,
  syncGreenButtonAction,
} from "@/app/actions/app";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getConfiguredGreenButtonProviders,
  isGreenButtonConfigured,
} from "@/lib/green-button/providers";
import { PageBackNav } from "@/components/layout/page-back-nav";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  sandbox: "Test integration using the public Green Button sandbox.",
  enbridge: "Import gas bills after registering as a Green Button third-party provider.",
  alectra: "Import electricity bills after registering as a Green Button third-party provider.",
};

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger"> = {
  connected: "success",
  pending: "warning",
  expired: "warning",
  error: "danger",
  revoked: "danger",
};

export default async function UtilityConnectPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{
    connected?: string;
    disconnected?: string;
    synced?: string;
    imported?: string;
    skipped?: string;
    error?: string;
  }>;
}) {
  const { propertyId } = await params;
  const query = await searchParams;
  const user = await requireUser();

  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId: user.id },
  });
  if (!property) notFound();

  const connections = await prisma.greenButtonConnection.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
  });

  const configuredProviders = getConfiguredGreenButtonProviders();
  const greenButtonReady = isGreenButtonConfigured();

  return (
    <div className="space-y-6">
      <PageBackNav parent={{ href: `/properties/${propertyId}`, label: property.name }} />

      <div>
        <h1 className="text-2xl font-bold">Green Button Connections</h1>
        <p className="text-slate-500">
          Connect Enbridge, Alectra, or the sandbox to automatically import utility bills.
        </p>
      </div>

      {query.connected && (
        <Alert>
          Connected to {query.connected}. Initial bill sync has been attempted.
        </Alert>
      )}
      {query.disconnected && <Alert>Utility connection removed.</Alert>}
      {query.synced && (
        <Alert>
          Sync complete — {query.imported ?? 0} bill(s) imported, {query.skipped ?? 0} skipped.
        </Alert>
      )}
      {query.error && <Alert variant="error">{decodeURIComponent(query.error)}</Alert>}

      {!greenButtonReady && (
        <Alert variant="warning">
          No Green Button providers are configured. Add credentials to your environment — the
          sandbox works out of the box with default values. See README for Enbridge and Alectra
          registration steps.
        </Alert>
      )}

      {!user.settings?.utilityAutomationEnabled && (
        <Alert variant="warning">
          Enable <strong>Utility automation</strong> in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          to include this property in scheduled Green Button syncs.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connect a utility account</CardTitle>
          <CardDescription>
            You will be redirected to the utility&apos;s Green Button portal to authorize access.
            Bills are imported as utility bills and split using your existing rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configuredProviders.length === 0 ? (
            <p className="text-sm text-slate-500">No providers available.</p>
          ) : (
            configuredProviders.map((provider) => {
              const existing = connections.find((c) => c.provider === provider.id);
              return (
                <div
                  key={provider.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{provider.label}</p>
                    <p className="text-sm text-slate-500">
                      {PROVIDER_DESCRIPTIONS[provider.id]}
                    </p>
                  </div>
                  {existing ? (
                    <Badge variant={STATUS_VARIANT[existing.status] ?? "default"}>
                      {existing.status}
                    </Badge>
                  ) : (
                    <Link
                      href={`/api/green-button/connect?propertyId=${propertyId}&provider=${provider.id}`}
                    >
                      <Button variant="outline">Connect {provider.label}</Button>
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {configuredProviders.some((p) => p.id === "sandbox") && (
        <Card>
          <CardHeader>
            <CardTitle>Sandbox manual connect (dev)</CardTitle>
            <CardDescription>
              OAuth redirect requires registering your callback URL with the data custodian. For
              local testing, paste a sandbox access token from the{" "}
              <a
                href="http://greenbuttonalliance.github.io/OpenESPI-GreenButton-API-Documentation/API/"
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                Green Button API docs
              </a>{" "}
              (e.g. alan — Subscription ID 5).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={connectGreenButtonManualAction.bind(null, propertyId)}
              className="space-y-3"
            >
              <input type="hidden" name="provider" value="sandbox" />
              <div className="space-y-1">
                <label htmlFor="accessToken" className="text-sm font-medium">
                  Access token
                </label>
                <input
                  id="accessToken"
                  name="accessToken"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="f48223ce-92f5-4a41-9028-1a370eb102c5"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="subscriptionId" className="text-sm font-medium">
                    Subscription ID (optional)
                  </label>
                  <input
                    id="subscriptionId"
                    name="subscriptionId"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="5"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="usagePointId" className="text-sm font-medium">
                    Usage point ID (optional)
                  </label>
                  <input
                    id="usagePointId"
                    name="usagePointId"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="1"
                  />
                </div>
              </div>
              <Button type="submit" variant="outline">
                Connect with token
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active connections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.length === 0 ? (
            <p className="text-sm text-slate-500">No connections yet.</p>
          ) : (
            connections.map((connection) => {
              const syncAction = syncGreenButtonAction.bind(null, connection.id);
              const disconnectAction = disconnectGreenButtonAction.bind(null, connection.id);
              const providerLabel =
                configuredProviders.find((p) => p.id === connection.provider)?.label ??
                connection.provider;

              return (
                <div
                  key={connection.id}
                  className="rounded-lg border border-slate-200 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{providerLabel}</p>
                      {connection.accountLabel && (
                        <p className="text-sm text-slate-500">{connection.accountLabel}</p>
                      )}
                    </div>
                    <Badge variant={STATUS_VARIANT[connection.status] ?? "default"}>
                      {connection.status}
                    </Badge>
                  </div>

                  <dl className="grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Last synced</dt>
                      <dd>
                        {connection.lastSyncedAt
                          ? connection.lastSyncedAt.toLocaleString("en-CA")
                          : "Never"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Subscription</dt>
                      <dd>{connection.subscriptionId || "—"}</dd>
                    </div>
                  </dl>

                  {connection.lastSyncError && (
                    <Alert variant="error">{connection.lastSyncError}</Alert>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <form action={syncAction}>
                      <Button type="submit" size="sm" variant="outline">
                        Sync now
                      </Button>
                    </form>
                    <form action={disconnectAction}>
                      <Button type="submit" size="sm" variant="outline">
                        Disconnect
                      </Button>
                    </form>
                    <Link href={`/properties/${propertyId}/utility-bills`}>
                      <Button size="sm" variant="ghost">
                        View bills
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
