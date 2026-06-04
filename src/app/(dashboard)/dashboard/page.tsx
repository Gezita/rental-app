import Link from "next/link";
import {
  AlertCircle,
  Banknote,
  Building2,
  CircleDollarSign,
  Clock,
  FileText,
  PiggyBank,
  Wrench,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { syncOverdueStatements } from "@/lib/overdue";
import { getLeasesEndingSoon } from "@/lib/lease-reminders";
import { getPaymentStatus } from "@/lib/payment-status";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
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
import { cn } from "@/lib/utils";

function ListRow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted/40 px-4 py-3 text-sm transition-colors hover:border-border hover:bg-surface-muted/80",
        className
      )}
    >
      {children}
    </li>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  await syncOverdueStatements(user.id);

  const settings = user.settings;
  const reminderDays = settings?.leaseReminderDays ?? 30;

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    include: {
      units: {
        include: {
          tenants: { where: { isActive: true } },
        },
      },
    },
  });

  const totalRentCents = properties.reduce(
    (sum, p) => sum + p.units.reduce((uSum, u) => uSum + u.rentAmountCents, 0),
    0
  );

  const statements = await prisma.statement.findMany({
    where: { unit: { property: { userId: user.id } } },
    select: {
      status: true,
      totalDueCents: true,
      paidAmountCents: true,
      stripeCheckoutSessionId: true,
    },
  });

  const paymentCounts = {
    paid: 0,
    unpaid: 0,
    overdue: 0,
    partial: 0,
    pending: 0,
    draft: 0,
  };

  let outstandingCents = 0;
  let collectedCents = 0;

  for (const s of statements) {
    const ps = getPaymentStatus(s);
    if (ps.key === "paid") paymentCounts.paid += 1;
    else if (ps.key === "overdue") paymentCounts.overdue += 1;
    else if (ps.key === "partial") paymentCounts.partial += 1;
    else if (ps.key === "pending_online") paymentCounts.pending += 1;
    else if (ps.key === "unpaid") paymentCounts.unpaid += 1;
    else if (ps.key === "draft") paymentCounts.draft += 1;

    collectedCents += s.paidAmountCents;
    if (ps.key !== "paid" && ps.key !== "draft") {
      outstandingCents += Math.max(0, s.totalDueCents - s.paidAmountCents);
    }
  }

  const draftStatements = paymentCounts.draft;

  const openMaintenance = await prisma.maintenanceRecord.count({
    where: {
      property: { userId: user.id },
      status: { in: ["planned", "in_progress"] },
    },
  });

  const recentDocuments = await prisma.document.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { property: true },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const propertyIds = properties.map((p) => p.id);
  const billsThisMonth = propertyIds.length
    ? await prisma.utilityBill.count({
        where: {
          propertyId: { in: propertyIds },
          billingPeriodStart: { lte: monthEnd },
          billingPeriodEnd: { gte: monthStart },
        },
      })
    : 0;

  const unitCount = properties.reduce((sum, p) => sum + p.units.length, 0);
  const missingBills = unitCount > 0 && billsThisMonth === 0 ? 1 : 0;

  const leasesEndingSoon = await getLeasesEndingSoon(user.id, reminderDays);

  const unpaidStatements = await prisma.statement.findMany({
    where: {
      unit: { property: { userId: user.id } },
      status: { in: ["sent", "overdue"] },
    },
    include: {
      tenant: true,
      unit: { include: { property: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 5,
  });

  const paymentBreakdown = [
    { label: "Paid", count: paymentCounts.paid, accent: "text-success" },
    { label: "Unpaid", count: paymentCounts.unpaid, accent: "text-foreground" },
    { label: "Overdue", count: paymentCounts.overdue, accent: "text-danger" },
    { label: "Partial", count: paymentCounts.partial, accent: "text-warning" },
    { label: "Pending online", count: paymentCounts.pending, accent: "text-warning" },
    { label: "Drafts", count: draftStatements, accent: "text-muted" },
  ] as const;

  const displayName = user.name || user.email.split("@")[0];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-gradient-to-br from-surface via-surface to-primary-muted/30 p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <PageHeader
          title={`Hello, ${displayName}`}
          description="Here’s an overview of rent, payments, and property activity."
          actions={
            <>
              <Link href="/properties/new">
                <Button>Add Property</Button>
              </Link>
              <Link href="/statements/generate">
                <Button variant="outline">Generate Statements</Button>
              </Link>
            </>
          }
        />
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
          Financial overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Monthly rent expected"
            value={formatMoney(totalRentCents)}
            icon={CircleDollarSign}
            accent="primary"
          />
          <StatCard
            label="Collected (all time)"
            value={formatMoney(collectedCents)}
            icon={PiggyBank}
            accent="success"
            valueClassName="text-success"
          />
          <StatCard
            label="Outstanding balance"
            value={formatMoney(outstandingCents)}
            icon={Banknote}
            accent={outstandingCents > 0 ? "danger" : "neutral"}
            valueClassName={outstandingCents > 0 ? "text-danger" : undefined}
          />
          <StatCard
            label="Open maintenance"
            value={openMaintenance}
            icon={Wrench}
            accent={openMaintenance > 0 ? "warning" : "neutral"}
          />
        </div>
      </section>

      <section>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Statement status</CardTitle>
            <CardDescription>Count by payment state across all units</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {paymentBreakdown.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border-subtle bg-surface-muted/50 px-4 py-3 text-center"
                >
                  <p className={cn("text-2xl font-semibold tabular-nums", item.accent)}>
                    {item.count}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {(settings?.autoSendStatements || settings?.utilityAutomationEnabled || missingBills > 0) && (
        <section className="space-y-3">
          {settings?.autoSendStatements && (
            <Alert variant="info">
              Automatic invoice sender is on — statements go out on day{" "}
              {settings.autoSendDayOfMonth} of each month.{" "}
              <Link href="/settings" className="font-medium underline underline-offset-2">
                Settings
              </Link>
            </Alert>
          )}
          {settings?.utilityAutomationEnabled && (
            <Alert variant="info">
              <strong>Green Button utility sync</strong> is enabled. Connect accounts on each
              property&apos;s Green Button page, then schedule{" "}
              <code className="rounded-md bg-primary-muted/80 px-1.5 py-0.5 text-xs">
                /api/cron/green-button-sync
              </code>{" "}
              or use Sync in{" "}
              <Link href="/settings" className="font-medium underline underline-offset-2">
                Settings
              </Link>
              .
            </Alert>
          )}
          {missingBills > 0 && properties.length > 0 && (
            <Alert variant="warning">
              No utility bills uploaded for the current billing period.{" "}
              <Link
                href={`/properties/${properties[0].id}/utility-bills/new`}
                className="font-medium underline underline-offset-2"
              >
                Upload a bill
              </Link>
            </Alert>
          )}
        </section>
      )}

      {leasesEndingSoon.length > 0 && (
        <Card className="border-warning/25">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <CardTitle>Leases ending soon</CardTitle>
            </div>
            <CardDescription>Within {reminderDays} days</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {leasesEndingSoon.map((lease) => (
                <ListRow key={lease.leaseId}>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {lease.propertyName} · {lease.unitName}
                    </p>
                    <p className="text-muted">
                      {lease.tenantName} — ends{" "}
                      {lease.leaseEndDate.toLocaleDateString("en-CA")}
                      {lease.daysRemaining === 0
                        ? " (today)"
                        : ` (${lease.daysRemaining} days)`}
                    </p>
                  </div>
                  <Link href={`/properties/${lease.propertyId}/units/${lease.unitId}`}>
                    <Button variant="outline" size="sm">
                      View unit
                    </Button>
                  </Link>
                </ListRow>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {unpaidStatements.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-danger" />
              <CardTitle>Outstanding statements</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {unpaidStatements.map((s) => (
                <ListRow key={s.id}>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{s.statementNumber}</p>
                    <p className="text-muted">
                      {s.unit.property.name} / {s.unit.name}
                    </p>
                    <p className="mt-0.5 font-medium tabular-nums text-foreground">
                      {formatMoney(s.totalDueCents - s.paidAmountCents)} due
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <PaymentStatusBadge
                      status={s.status}
                      totalDueCents={s.totalDueCents}
                      paidAmountCents={s.paidAmountCents}
                      stripeCheckoutSessionId={s.stripeCheckoutSessionId}
                    />
                    <Link href={`/statements/${s.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </ListRow>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Properties</CardTitle>
            </div>
            <CardDescription>
              {properties.length} properties, {unitCount} units
            </CardDescription>
          </CardHeader>
          <CardContent>
            {properties.length === 0 ? (
              <p className="text-sm text-muted">
                Get started by adding your first property.{" "}
                <Link
                  href="/properties/new"
                  className="font-medium text-primary-hover underline underline-offset-2"
                >
                  Add property
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {properties.map((property) => (
                  <ListRow key={property.id}>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{property.name}</p>
                      <p className="text-muted">
                        {property.units.length} units · {property.city}
                      </p>
                    </div>
                    <Link href={`/properties/${property.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </ListRow>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Recent documents</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <p className="text-sm text-muted">No documents yet.</p>
            ) : (
              <ul className="divide-y divide-border-subtle">
                {recentDocuments.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
                  >
                    <span className="truncate font-medium text-foreground">{doc.fileName}</span>
                    <Badge variant="secondary">{doc.category.replace("_", " ")}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
