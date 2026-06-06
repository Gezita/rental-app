import Link from "next/link";
import {
  AlertCircle,
  Banknote,
  Building2,
  CircleDollarSign,
  Clock,
  FileText,
  Home,
  PiggyBank,
  Users,
  Wrench,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { syncOverdueStatements } from "@/lib/overdue";
import { getLeasesEndingSoon } from "@/lib/lease-reminders";
import { computePortfolioStats } from "@/lib/portfolio-stats";
import {
  PAYMENT_BREAKDOWN_ORDER,
  PAYMENT_STATUS_ACCENTS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/payment-status";
import { aggregateStatementStats } from "@/lib/statement-stats";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { ListRow } from "@/components/dashboard/list-row";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { StatCard } from "@/components/dashboard/stat-card";
import { FlashAlert } from "@/components/flash-alert";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const RECENT_PROPERTY_LIMIT = 5;

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
          tenants: { where: { isActive: true }, select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const portfolio = computePortfolioStats(properties);

  const statements = await prisma.statement.findMany({
    where: { unit: { property: { userId: user.id } } },
    select: {
      status: true,
      totalDueCents: true,
      paidAmountCents: true,
      stripeCheckoutSessionId: true,
    },
  });

  const { outstandingCents, collectedCents, counts: paymentCounts } =
    aggregateStatementStats(statements);

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
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const billsByProperty =
    propertyIds.length > 0
      ? await prisma.utilityBill.groupBy({
          by: ["propertyId"],
          where: {
            propertyId: { in: propertyIds },
            OR: [
              { billMonth: currentMonth, billYear: currentYear },
              {
                billingPeriodStart: { lte: monthEnd },
                billingPeriodEnd: { gte: monthStart },
              },
            ],
          },
        })
      : [];

  const propertiesWithBills = new Set(billsByProperty.map((row) => row.propertyId));
  const propertiesMissingBills = properties.filter(
    (property) => property.units.length > 0 && !propertiesWithBills.has(property.id)
  );

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

  const [utilityRuleCount, statementCount, tenantUnit] = await Promise.all([
    prisma.utilityRule.count({
      where: {
        unit: { property: { userId: user.id } },
        tenantPays: true,
        includedInRent: false,
        percentage: { gt: 0 },
      },
    }),
    prisma.statement.count({
      where: { unit: { property: { userId: user.id } } },
    }),
    prisma.unit.findFirst({
      where: {
        property: { userId: user.id },
        tenants: { some: { isActive: true } },
      },
      select: { id: true, propertyId: true },
    }),
  ]);

  const firstProperty = properties[0];
  const onboardingSteps = [
    {
      id: "property",
      label: "Add a property",
      description: "Create your first rental property with address details.",
      done: properties.length > 0,
      href: "/properties/new",
    },
    {
      id: "tenant",
      label: "Add a unit and tenant",
      description: "Set rent amount and assign an active tenant to a unit.",
      done: Boolean(tenantUnit),
      href: firstProperty
        ? `/properties/${firstProperty.id}/units/new`
        : "/properties/new",
    },
    {
      id: "utilities",
      label: "Configure utility split rules",
      description: "Define how gas, water, and electricity are split per unit.",
      done: utilityRuleCount > 0,
      href: tenantUnit
        ? `/properties/${tenantUnit.propertyId}/units/${tenantUnit.id}/utilities`
        : firstProperty
          ? `/properties/${firstProperty.id}`
          : "/properties/new",
    },
    {
      id: "bills",
      label: "Import monthly bill amounts",
      description: "Upload an .xlsx or enter amounts for the current month.",
      done: propertiesMissingBills.length === 0 && portfolio.unitCount > 0,
      href: firstProperty
        ? `/properties/${firstProperty.id}/utility-bills/import`
        : "/utility-bills",
    },
    {
      id: "statements",
      label: "Generate your first statements",
      description: "Create draft statements from rent and utility data.",
      done: statementCount > 0,
      href: "/statements/generate",
    },
  ];

  const displayName = user.name || user.email.split("@")[0];
  const vacantUnits = portfolio.unitCount - portfolio.occupiedUnitCount;
  const recentProperties = properties.slice(0, RECENT_PROPERTY_LIMIT);
  const needsAttention =
    propertiesMissingBills.length > 0 ||
    leasesEndingSoon.length > 0 ||
    unpaidStatements.length > 0;

  const occupancyHint =
    portfolio.unitCount === 0
      ? "No units yet"
      : `${portfolio.occupiedUnitCount} occupied · ${vacantUnits} vacant`;

  const rentHint =
    portfolio.occupiedUnitCount === 0
      ? "No occupied units"
      : `${formatMoney(portfolio.occupiedRentCents)} from ${portfolio.occupiedUnitCount} occupied unit${portfolio.occupiedUnitCount === 1 ? "" : "s"}`;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hello, ${displayName}`}
        description="Portfolio snapshot, rent collection, and items that need your attention."
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

      {settings?.autoSendStatements && (
        <FlashAlert variant="info" clearParams={[]}>
          Automatic statement sender is on — statements go out on day{" "}
          {settings.autoSendDayOfMonth} of each month.{" "}
          <Link href="/settings" className="font-medium underline underline-offset-2">
            Settings
          </Link>
        </FlashAlert>
      )}

      {needsAttention && (
        <section className="space-y-3">
          <SectionHeading>Needs attention</SectionHeading>
          {propertiesMissingBills.map((property) => (
            <FlashAlert key={property.id} variant="warning" clearParams={[]}>
              No utility bills for {property.name} this month.{" "}
              <Link
                href={`/properties/${property.id}/utility-bills/import`}
                className="font-medium underline underline-offset-2"
              >
                Import bill amounts
              </Link>
            </FlashAlert>
          ))}
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
                  <CardTitle>Unpaid statements</CardTitle>
                </div>
                <CardDescription>Sent or overdue — review and follow up</CardDescription>
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
        </section>
      )}

      <section>
        <SectionHeading>Portfolio</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Properties"
            value={portfolio.propertyCount}
            icon={Building2}
            accent="primary"
            href="/properties"
          />
          <StatCard
            label="Total units"
            value={portfolio.unitCount}
            hint={occupancyHint}
            icon={Home}
            accent="primary"
            href="/properties"
          />
          <StatCard
            label="Active tenants"
            value={portfolio.activeTenantCount}
            icon={Users}
            accent="primary"
            href="/properties"
          />
          <StatCard
            label="Scheduled rent (all units)"
            value={formatMoney(portfolio.scheduledRentCents)}
            hint={rentHint}
            icon={CircleDollarSign}
            accent="primary"
          />
        </div>
      </section>

      <section>
        <SectionHeading>Financial overview</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Outstanding (unpaid statements)"
            value={formatMoney(outstandingCents)}
            icon={Banknote}
            accent={outstandingCents > 0 ? "danger" : "neutral"}
            valueClassName={outstandingCents > 0 ? "text-danger" : undefined}
            href={outstandingCents > 0 ? "/statements?payment=unpaid" : "/statements"}
          />
          <StatCard
            label="Collected (lifetime)"
            value={formatMoney(collectedCents)}
            icon={PiggyBank}
            accent="success"
            valueClassName="text-success"
            href="/statements?payment=paid"
          />
          <StatCard
            label="Open maintenance"
            value={openMaintenance}
            icon={Wrench}
            accent={openMaintenance > 0 ? "warning" : "neutral"}
            href="/maintenance?status=open"
          />
          <StatCard
            label="Draft statements"
            value={paymentCounts.draft}
            icon={FileText}
            accent={paymentCounts.draft > 0 ? "warning" : "neutral"}
            href={paymentCounts.draft > 0 ? "/statements?payment=draft" : "/statements"}
          />
        </div>
      </section>

      <OnboardingChecklist steps={onboardingSteps} />

      <section>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment status</CardTitle>
            <CardDescription>Statement counts by payment state across all units</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {PAYMENT_BREAKDOWN_ORDER.map((key) => (
                <Link
                  key={key}
                  href={`/statements?payment=${key}`}
                  className="rounded-xl border border-border bg-surface px-4 py-3 text-center shadow-[var(--shadow-sm)] transition-colors hover:border-primary/20 hover:bg-primary-muted/30"
                >
                  <p className={cn("text-2xl font-semibold tabular-nums", PAYMENT_STATUS_ACCENTS[key])}>
                    {paymentCounts[key]}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted">
                    {PAYMENT_STATUS_LABELS[key]}
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Recent properties</CardTitle>
              </div>
              <CardDescription>
                {portfolio.propertyCount} propert{portfolio.propertyCount === 1 ? "y" : "ies"},{" "}
                {portfolio.unitCount} unit{portfolio.unitCount === 1 ? "" : "s"}
              </CardDescription>
            </div>
            {properties.length > RECENT_PROPERTY_LIMIT && (
              <Link href="/properties">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            )}
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
                {recentProperties.map((property) => {
                  const occupied = property.units.filter((u) => u.tenants.length > 0).length;
                  return (
                    <ListRow key={property.id}>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{property.name}</p>
                        <p className="text-muted">
                          {property.city} · {occupied}/{property.units.length} occupied
                        </p>
                      </div>
                      <Link href={`/properties/${property.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </ListRow>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Recent documents</CardTitle>
              </div>
              <CardDescription>Last 5 uploads</CardDescription>
            </div>
            <Link href="/documents">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <p className="text-sm text-muted">
                No documents yet.{" "}
                <Link href="/documents" className="font-medium text-primary-hover underline">
                  Upload a document
                </Link>
              </p>
            ) : (
              <ul className="divide-y divide-border-subtle">
                {recentDocuments.map((doc) => (
                  <li key={doc.id} className="first:pt-0 last:pb-0">
                    <Link
                      href={`/api/documents/${doc.id}`}
                      target="_blank"
                      className="flex items-center justify-between gap-3 rounded-lg py-3 text-sm transition-colors hover:bg-surface-muted/60"
                    >
                      <span className="truncate font-medium text-foreground">{doc.fileName}</span>
                      <Badge variant="secondary">{doc.category.replace("_", " ")}</Badge>
                    </Link>
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
