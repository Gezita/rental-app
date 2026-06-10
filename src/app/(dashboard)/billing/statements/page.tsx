import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { syncOverdueStatements } from "@/lib/overdue";
import { getPaymentStatus, getOutstandingCents, type PaymentStatusKey } from "@/lib/payment-status";
import { aggregateStatementStats } from "@/lib/statement-stats";
import { MONTH_NAMES } from "@/lib/billing-constants";
import { FlashAlert } from "@/components/flash-alert";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { StatGroup } from "@/components/dashboard/stat-group";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatementsPaymentFilter } from "@/components/statements-payment-filter";
import { StatementsUnitFilter } from "@/components/statements-unit-filter";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";

const PAYMENT_FILTER_KEYS: PaymentStatusKey[] = [
  "draft",
  "unpaid",
  "overdue",
  "partial",
  "pending_online",
  "paid",
];

function isPaymentFilter(value?: string): value is PaymentStatusKey {
  return Boolean(value && PAYMENT_FILTER_KEYS.includes(value as PaymentStatusKey));
}

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    generated?: string;
    deleted?: string;
    units?: string;
    unitId?: string;
    payment?: string;
  }>;
}) {
  const user = await requireUser();
  const { generated, deleted, units, unitId, payment } = await searchParams;
  const paymentFilter = isPaymentFilter(payment) ? payment : undefined;

  await syncOverdueStatements(user.id);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [allStatements, userUnits] = await Promise.all([
    prisma.statement.findMany({
      where: {
        unit: {
          property: { userId: user.id },
          ...(unitId ? { id: unitId } : {}),
        },
      },
      include: {
        tenant: true,
        unit: { include: { property: true } },
      },
      orderBy: [{ statementYear: "desc" }, { statementMonth: "desc" }],
    }),
    prisma.unit.findMany({
      where: { property: { userId: user.id } },
      include: {
        property: true,
        _count: { select: { statements: true } },
      },
      orderBy: [{ property: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  const statements = paymentFilter
    ? allStatements.filter((statement) => getPaymentStatus(statement).key === paymentFilter)
    : allStatements;

  const stats = aggregateStatementStats(allStatements);
  const { outstandingCents, collectedCents, counts } = stats;
  const draftCount = counts.draft;
  const overdueCount = counts.overdue;

  const unitFilterOptions = userUnits
    .filter((unit) => unit._count.statements > 0)
    .map((unit) => ({
      unitId: unit.id,
      label: `${unit.property.name} — ${unit.name}`,
      count: unit._count.statements,
    }));

  const totalStatementCount = userUnits.reduce((sum, unit) => sum + unit._count.statements, 0);
  const activeUnit = unitId ? userUnits.find((unit) => unit.id === unitId) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statements"
        description="Monthly tenant billing — rent, utilities, and balances"
        actions={
          <>
            <Link href={`/billing/statements/generate?month=${currentMonth}&year=${currentYear}`}>
              <Button variant="outline">Generate this month</Button>
            </Link>
            <Link href="/billing/statements/generate">
              <Button>Generate monthly statements</Button>
            </Link>
          </>
        }
      />

      {generated && (
        <FlashAlert clearParams={["generated", "units"]}>
          {units
            ? `Draft statements created for ${units}. Review and send when ready.`
            : "Statements generated as drafts. Review and send when ready."}
        </FlashAlert>
      )}
      {deleted && (
        <FlashAlert clearParams={["deleted"]}>Statement deleted.</FlashAlert>
      )}

      {totalStatementCount > 0 && (
        <StatGroup
          items={[
            {
              label: "Outstanding (unpaid)",
              value: formatMoney(outstandingCents),
              valueClassName: outstandingCents > 0 ? "text-danger" : "text-success",
              href: outstandingCents > 0 ? "/billing/statements?payment=unpaid" : undefined,
            },
            {
              label: "Collected (lifetime)",
              value: formatMoney(collectedCents),
              valueClassName: "text-success",
              href: "/billing/statements?payment=paid",
            },
            {
              label: "Draft statements",
              value: String(draftCount),
              href: draftCount > 0 ? "/billing/statements?payment=draft" : undefined,
            },
            {
              label: "Overdue",
              value: String(overdueCount),
              valueClassName: overdueCount > 0 ? "text-danger" : undefined,
              href: overdueCount > 0 ? "/billing/statements?payment=overdue" : undefined,
            },
          ]}
        />
      )}

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>
            {activeUnit
              ? `${activeUnit.property.name} — ${activeUnit.name}`
              : "All statements"}
          </CardTitle>
          <StatementsPaymentFilter activePayment={paymentFilter} activeUnitId={unitId} />
          {unitFilterOptions.length > 1 && (
            <StatementsUnitFilter
              units={unitFilterOptions}
              activeUnitId={unitId}
              activePayment={paymentFilter}
              totalCount={totalStatementCount}
            />
          )}
        </CardHeader>
        <CardContent>
          {totalStatementCount === 0 ? (
            <p className="text-sm text-muted">
              No statements yet.{" "}
              <Link href="/billing/statements/generate" className="underline">
                Generate your first statements
              </Link>
            </p>
          ) : statements.length === 0 ? (
            <p className="text-sm text-muted">
              {paymentFilter
                ? "No statements match this filter. "
                : "No statements for this unit. "}
              <Link href="/billing/statements" className="underline">
                Show all
              </Link>
            </p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Tenant</Th>
                  <Th>Unit</Th>
                  <Th>Period</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Paid</Th>
                  <Th className="text-right">Balance</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {statements.map((s) => {
                  const balance = getOutstandingCents(s);
                  const ps = getPaymentStatus(s);
                  return (
                    <Tr key={s.id}>
                      <Td>
                        <p className="font-medium">
                          {s.tenant.firstName} {s.tenant.lastName}
                        </p>
                        <p className="text-xs text-muted">{s.unit.property.name}</p>
                      </Td>
                      <Td>{s.unit.name}</Td>
                      <Td>
                        {MONTH_NAMES[s.statementMonth - 1]} {s.statementYear}
                      </Td>
                      <Td className="text-right tabular-nums">{formatMoney(s.totalDueCents)}</Td>
                      <Td className="text-right tabular-nums text-success">
                        {s.paidAmountCents > 0 ? formatMoney(s.paidAmountCents) : "—"}
                      </Td>
                      <Td
                        className={`text-right font-medium tabular-nums ${
                          balance > 0
                            ? ps.key === "overdue"
                              ? "text-danger"
                              : "text-warning"
                            : "text-muted"
                        }`}
                      >
                        {balance > 0 ? formatMoney(balance) : "—"}
                      </Td>
                      <Td>
                        <PaymentStatusBadge
                          status={s.status}
                          totalDueCents={s.totalDueCents}
                          paidAmountCents={s.paidAmountCents}
                          stripeCheckoutSessionId={s.stripeCheckoutSessionId}
                        />
                      </Td>
                      <Td>
                        <Link href={`/billing/statements/${s.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
