import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { syncOverdueStatements } from "@/lib/overdue";
import { getPaymentStatus, type PaymentStatusKey } from "@/lib/payment-status";
import { MONTH_NAMES } from "@/lib/statements";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { FlashAlert } from "@/components/flash-alert";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
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
      <PageBackNav />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Statements</h1>
          <p className="text-muted">Monthly tenant billing statements</p>
        </div>
        <div className="flex gap-2">
          <Link href="/statements/generate">
            <Button>Generate statements</Button>
          </Link>
        </div>
      </div>

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

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>
            {activeUnit
              ? `${activeUnit.property.name} — ${activeUnit.name}`
              : "All Statements"}
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
              <Link href="/statements/generate" className="underline">
                Generate your first statements
              </Link>
            </p>
          ) : statements.length === 0 ? (
            <p className="text-sm text-muted">
              {paymentFilter
                ? "No statements match this filter. "
                : "No statements for this unit. "}
              <Link href="/statements" className="underline">
                Show all
              </Link>
            </p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Unit</Th>
                  <Th>Statement #</Th>
                  <Th>Property</Th>
                  <Th>Tenant</Th>
                  <Th>Period</Th>
                  <Th>Total</Th>
                  <Th>Workflow</Th>
                  <Th>Payment</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {statements.map((s) => (
                  <Tr key={s.id}>
                    <Td className="font-medium">{s.unit.name}</Td>
                    <Td className="text-muted-foreground">{s.statementNumber}</Td>
                    <Td>{s.unit.property.name}</Td>
                    <Td>
                      {s.tenant.firstName} {s.tenant.lastName}
                    </Td>
                    <Td>
                      {MONTH_NAMES[s.statementMonth - 1]} {s.statementYear}
                    </Td>
                    <Td>{formatMoney(s.totalDueCents)}</Td>
                    <Td className="capitalize text-muted-foreground">{s.status}</Td>
                    <Td>
                      <PaymentStatusBadge
                        status={s.status}
                        totalDueCents={s.totalDueCents}
                        paidAmountCents={s.paidAmountCents}
                        stripeCheckoutSessionId={s.stripeCheckoutSessionId}
                      />
                    </Td>
                    <Td>
                      <Link href={`/statements/${s.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
