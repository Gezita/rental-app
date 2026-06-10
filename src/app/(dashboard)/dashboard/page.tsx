import Link from "next/link";
import { AlertCircle, Building2, Clock, FileText } from "lucide-react";
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
import { HeroKpiRow } from "@/components/dashboard/hero-kpi-row";
import { ListRow } from "@/components/dashboard/list-row";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { StatGroup } from "@/components/dashboard/stat-group";
import { computeDashboardHeroStats } from "@/lib/dashboard-hero-stats";
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
import { MONTH_NAMES } from "@/lib/billing-constants";
import { buildBillingNextSteps, computeBillingReadiness } from "@/lib/billing-workflow";

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

  const { outstandingCents, counts: paymentCounts } = aggregateStatementStats(statements);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [openMaintenance, monthlyPayments] = await Promise.all([
    prisma.maintenanceRecord.count({
      where: {
        property: { userId: user.id },
        status: { in: ["planned", "in_progress"] },
      },
    }),
    prisma.payment.aggregate({
      where: {
        statement: { unit: { property: { userId: user.id } } },
        paymentDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amountCents: true },
    }),
  ]);

  const recentDocuments = await prisma.document.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { property: true },
  });

  const propertyIds = properties.map((p) => p.id);

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

  const [overdueStatements, openMaintenanceByProperty] = await Promise.all([
    prisma.statement.findMany({
      where: {
        unit: { property: { userId: user.id } },
        status: "overdue",
      },
      select: {
        totalDueCents: true,
        paidAmountCents: true,
        unit: { select: { propertyId: true } },
      },
    }),
    prisma.maintenanceRecord.groupBy({
      by: ["propertyId"],
      where: {
        property: { userId: user.id },
        status: { in: ["planned", "in_progress"] },
      },
      _count: { _all: true },
    }),
  ]);

  const overdueCount = overdueStatements.length;
  const overdueCents = overdueStatements.reduce(
    (sum, statement) => sum + (statement.totalDueCents - statement.paidAmountCents),
    0
  );

  const overdueByProperty = new Map<string, { count: number; cents: number }>();
  for (const statement of overdueStatements) {
    const entry = overdueByProperty.get(statement.unit.propertyId) ?? { count: 0, cents: 0 };
    entry.count += 1;
    entry.cents += statement.totalDueCents - statement.paidAmountCents;
    overdueByProperty.set(statement.unit.propertyId, entry);
  }
  const maintenanceCountByProperty = new Map(
    openMaintenanceByProperty.map((row) => [row.propertyId, row._count._all])
  );

  const [utilityRuleCount, statementCount, utilityBillCount, tenantUnit] = await Promise.all([
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
    prisma.utilityBill.count({
      where: { property: { userId: user.id } },
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
      done: utilityBillCount > 0,
      href: firstProperty
        ? `/properties/${firstProperty.id}/utility-bills/import`
        : "/billing/utility-bills",
    },
    {
      id: "statements",
      label: "Generate your first statements",
      description: "Create draft statements from rent and utility data.",
      done: statementCount > 0,
      href: "/billing/statements/generate",
    },
  ];

  const showOnboardingChecklist = statementCount === 0 && utilityBillCount === 0;

  const [monthBills, monthStatements] = await Promise.all([
    propertyIds.length > 0
      ? prisma.utilityBill.findMany({
          where: {
            propertyId: { in: propertyIds },
            billMonth: currentMonth,
            billYear: currentYear,
          },
          select: { propertyId: true, utilityType: true },
        })
      : Promise.resolve([]),
    propertyIds.length > 0
      ? prisma.statement.findMany({
          where: {
            statementMonth: currentMonth,
            statementYear: currentYear,
            unit: { propertyId: { in: propertyIds } },
          },
          select: {
            status: true,
            unitId: true,
            statementMonth: true,
            statementYear: true,
            unit: { select: { name: true, propertyId: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const workflowProperties = properties.map((property) => ({
    id: property.id,
    name: property.name,
    unitCount: property.units.length,
    bills: monthBills
      .filter((bill) => bill.propertyId === property.id)
      .map((bill) => ({ utilityType: bill.utilityType })),
    statements: monthStatements
      .filter((statement) => statement.unit.propertyId === property.id)
      .map((statement) => ({
        unitId: statement.unitId,
        unitName: statement.unit.name,
        status: statement.status,
        statementMonth: statement.statementMonth,
        statementYear: statement.statementYear,
      })),
  }));

  const monthLabel = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;
  const billingReadiness = computeBillingReadiness(workflowProperties);
  const billingNextSteps = buildBillingNextSteps(workflowProperties, monthLabel);

  const heroStats = computeDashboardHeroStats({
    portfolio,
    monthlyCollectedCents: monthlyPayments._sum.amountCents ?? 0,
    outstandingCents,
    overdueCount,
    openMaintenance,
  });

  const displayName = user.name || user.email.split("@")[0];
  const vacantUnits = portfolio.unitCount - portfolio.occupiedUnitCount;
  const recentProperties = properties.slice(0, RECENT_PROPERTY_LIMIT);
  const needsAttention =
    propertiesMissingBills.length > 0 ||
    leasesEndingSoon.length > 0 ||
    overdueCount > 0;

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
        description="What needs your attention today."
        actions={
          <>
            <Link href="/properties/new">
              <Button>Add property</Button>
            </Link>
            <Link href="/billing/statements/generate">
              <Button variant="outline">Generate monthly statements</Button>
            </Link>
          </>
        }
      />

      <HeroKpiRow stats={heroStats} monthLabel={monthLabel} unitCount={portfolio.unitCount} />

      {properties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{monthLabel} billing</CardTitle>
            <CardDescription>
              {billingReadiness.readinessPercent}% of properties have all utility bills uploaded
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="rounded-full bg-primary transition-all"
                style={{ width: `${billingReadiness.readinessPercent}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/billing">
                <Button variant="outline" size="sm">
                  Open monthly workflow
                </Button>
              </Link>
              <Link href="/billing/statements/generate">
                <Button size="sm">Generate monthly statements</Button>
              </Link>
              <Link href="/billing/utility-bills">
                <Button variant="ghost" size="sm">
                  Upload utility bill
                </Button>
              </Link>
            </div>
            {billingNextSteps.length > 0 && (
              <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Next steps</p>
                <ol className="mt-2 space-y-2">
                  {billingNextSteps.slice(0, 3).map((step, index) => (
                    <li key={step.id} className="flex items-start gap-2 text-sm">
                      <span className="font-semibold text-primary-hover">{index + 1}.</span>
                      <Link href={step.href} className="font-medium text-foreground hover:text-primary-hover">
                        {step.label}
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          {overdueCount > 0 && (
            <Card className="border-danger/25">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-muted text-danger">
                    <AlertCircle className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted">Overdue statements</p>
                    <p className="text-xl font-semibold tabular-nums text-danger">
                      {formatMoney(overdueCents)}{" "}
                      <span className="text-base font-medium text-muted-foreground">
                        · {overdueCount} statement{overdueCount === 1 ? "" : "s"}
                      </span>
                    </p>
                  </div>
                </div>
                <Link href="/billing/statements?payment=overdue">
                  <Button variant="outline" size="sm">
                    Review overdue
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      <StatGroup
        title="Portfolio"
        items={[
          {
            label: "Properties",
            value: portfolio.propertyCount,
            href: "/properties",
          },
          {
            label: "Total units",
            value: portfolio.unitCount,
            hint: occupancyHint,
            href: "/properties",
          },
          {
            label: "Active tenants",
            value: portfolio.activeTenantCount,
            href: "/tenants",
          },
          {
            label: "Scheduled rent (all units)",
            value: formatMoney(portfolio.scheduledRentCents),
            hint: rentHint,
          },
        ]}
      />

      {showOnboardingChecklist && <OnboardingChecklist steps={onboardingSteps} />}

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
                  href={`/billing/statements?payment=${key}`}
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
                  const overdue = overdueByProperty.get(property.id);
                  const openMaintenanceCount = maintenanceCountByProperty.get(property.id) ?? 0;
                  return (
                    <ListRow key={property.id}>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{property.name}</p>
                        <p className="text-muted">
                          {property.city} · {occupied}/{property.units.length} occupied
                        </p>
                        {(overdue || openMaintenanceCount > 0) && (
                          <p className="mt-1 flex flex-wrap gap-1.5">
                            {overdue && (
                              <Badge variant="danger">
                                {formatMoney(overdue.cents)} overdue
                              </Badge>
                            )}
                            {openMaintenanceCount > 0 && (
                              <Badge variant="warning">
                                {openMaintenanceCount} maintenance
                              </Badge>
                            )}
                          </p>
                        )}
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
