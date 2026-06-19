import Link from "next/link";
import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UTILITY_TYPE_LABELS } from "@/lib/billing-constants";
import { MONTH_NAMES } from "@/lib/billing-constants";
import {
  buildBillingNextSteps,
  computeBillingReadiness,
  getMissingUtilityTypes,
} from "@/lib/billing-workflow";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/empty-state";
import { getUtilitySplitValidationIssues } from "@/lib/utility-split-validation";
import { Alert, Button, ButtonLink, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

export default async function BillingWorkflowPage() {
  const user = await requireUser();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthLabel = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;

  const properties = await prisma.property.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      units: {
        select: {
          id: true,
          name: true,
          statements: {
            where: { statementMonth: currentMonth, statementYear: currentYear },
            select: {
              status: true,
              unitId: true,
              statementMonth: true,
              statementYear: true,
            },
          },
        },
      },
      utilityBills: {
        where: { billMonth: currentMonth, billYear: currentYear },
        select: { utilityType: true, amountCents: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const workflowProperties = properties.map((property) => ({
    id: property.id,
    name: property.name,
    unitCount: property.units.length,
    bills: property.utilityBills,
    statements: property.units.flatMap((unit) =>
      unit.statements.map((statement) => ({
        unitId: statement.unitId,
        unitName: unit.name,
        status: statement.status,
        statementMonth: statement.statementMonth,
        statementYear: statement.statementYear,
      }))
    ),
  }));

  const readiness = computeBillingReadiness(workflowProperties);
  const nextSteps = buildBillingNextSteps(workflowProperties, monthLabel);

  const splitIssuesByProperty = await Promise.all(
    properties.map(async (property) => ({
      propertyId: property.id,
      propertyName: property.name,
      issues: await getUtilitySplitValidationIssues(property.id),
    }))
  );
  const propertiesWithSplitIssues = splitIssuesByProperty.filter(
    (entry) => entry.issues.length > 0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly workflow"
        description={`Guide ${monthLabel} billing from utility bills through tenant statements.`}
        actions={
          <>
            <ButtonLink href="/billing/statements/generate">Generate monthly statements</ButtonLink>
            <ButtonLink href="/billing/utility-bills" variant="outline">
              Upload utility bill
            </ButtonLink>
          </>
        }
      />

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Add a property and unit before you can run monthly billing."
          primaryAction={{ href: "/properties/new", label: "Add property" }}
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{monthLabel} billing readiness</CardTitle>
              <CardDescription>
                {readiness.readinessPercent}% of properties have all utility bills uploaded
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="rounded-full bg-primary transition-all"
                  style={{ width: `${readiness.readinessPercent}%` }}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-surface-muted/40 px-4 py-3">
                  <p className="text-xs font-medium text-muted">Properties ready</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {readiness.propertiesWithAllBills}/{properties.length}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface-muted/40 px-4 py-3">
                  <p className="text-xs font-medium text-muted">Draft statements</p>
                  <p className="text-xl font-semibold tabular-nums">{readiness.draftStatements}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-muted/40 px-4 py-3">
                  <p className="text-xs font-medium text-muted">Total units</p>
                  <p className="text-xl font-semibold tabular-nums">{readiness.totalUnits}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {propertiesWithSplitIssues.length > 0 && (
            <Alert variant="warning">
              <p className="font-medium">Utility split rules need attention</p>
              <ul className="mt-2 space-y-1 text-sm">
                {propertiesWithSplitIssues.map((entry) =>
                  entry.issues.map((issue) => (
                    <li key={`${entry.propertyId}-${issue.utilityType}`}>
                      <span className="font-medium">{entry.propertyName}</span> · {issue.label}:{" "}
                      {issue.issue === "incomplete"
                        ? `only ${issue.totalPercentage}% allocated (should total 100%)`
                        : issue.issue === "over_allocated"
                          ? `${issue.totalPercentage}% allocated (exceeds 100%)`
                          : "no active split rules"}
                      {" — "}
                      <Link
                        href={`/properties/${entry.propertyId}`}
                        className="font-medium underline underline-offset-2"
                      >
                        Review units
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </Alert>
          )}

          {nextSteps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Next steps</CardTitle>
                <CardDescription>Recommended actions to finish this month&apos;s billing</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {nextSteps.map((step, index) => (
                    <li key={step.id} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-muted text-xs font-semibold text-primary-hover">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{step.label}</p>
                        <Link
                          href={step.href}
                          className="text-sm font-medium text-primary-hover underline underline-offset-2"
                        >
                          Go to step
                        </Link>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {workflowProperties.map((property) => {
              const missing = getMissingUtilityTypes(property.bills);
              const allBillsPresent = missing.length === 0 && property.unitCount > 0;

              return (
                <Card key={property.id}>
                  <CardHeader>
                    <CardTitle>{property.name}</CardTitle>
                    <CardDescription>
                      {property.unitCount} unit{property.unitCount === 1 ? "" : "s"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        Utility bills
                      </p>
                      <ul className="space-y-2">
                        {(["gas", "water", "electricity"] as const).map((type) => {
                          const bill = property.bills.find((b) => b.utilityType === type);
                          return (
                            <li key={type} className="flex items-center gap-2 text-sm">
                              {bill ? (
                                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                              ) : (
                                <Circle className="h-4 w-4 text-muted" aria-hidden />
                              )}
                              <span className={bill ? "text-foreground" : "text-muted"}>
                                {UTILITY_TYPE_LABELS[type]}
                                {bill ? " uploaded" : " missing"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {property.statements.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                          Statements
                        </p>
                        <ul className="space-y-1 text-sm">
                          {property.statements.map((statement) => (
                            <li key={statement.unitId} className="flex items-center gap-2">
                              {allBillsPresent ? (
                                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
                              )}
                              <span>
                                {statement.unitName}: {statement.status}
                                {!allBillsPresent && " — utility bills incomplete"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Link href={`/properties/${property.id}/utility-bills/new`}>
                        <Button variant="outline" size="sm">
                          Upload bill
                        </Button>
                      </Link>
                      <Link href={`/properties/${property.id}/utility-bills/import`}>
                        <Button variant="outline" size="sm">
                          Import bill spreadsheet
                        </Button>
                      </Link>
                      <Link href="/billing/statements/generate">
                        <Button variant="ghost" size="sm">
                          Generate statements
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
