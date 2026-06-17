import Link from "next/link";
import { requireTenant } from "@/lib/tenant-auth";
import { listTenantStatements } from "@/lib/tenant-portal";
import { isTenantOnlinePaymentsEnabled, listPayableStatements } from "@/lib/tenant-payments";
import { TenantPayButton } from "@/components/tenant-stripe-buttons";
import { formatMoney } from "@/lib/money";
import { MONTH_NAMES } from "@/lib/billing-constants";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Table, Th, Td, Tr } from "@/components/ui";

export default async function TenantStatementsPage() {
  const tenant = await requireTenant();
  const statements = await listTenantStatements(tenant.id);
  const onlinePayments = isTenantOnlinePaymentsEnabled(tenant);
  const payableIds = new Set((await listPayableStatements(tenant.id)).map((s) => s.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Statements</h1>
        <p className="mt-1 text-sm text-muted">Monthly rent and utility bills for your unit</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All statements</CardTitle>
          <CardDescription>
            {tenant.unit.property.name} — {tenant.unit.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statements.length === 0 ? (
            <p className="text-sm text-muted">No statements available yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Statement</Th>
                  <Th>Period</Th>
                  <Th>Due date</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Balance</Th>
                  {onlinePayments && <Th className="text-right">Pay</Th>}
                </tr>
              </thead>
              <tbody>
                {statements.map((statement) => {
                  const monthLabel = `${MONTH_NAMES[statement.statementMonth - 1]} ${statement.statementYear}`;
                  const outstanding = Math.max(
                    0,
                    statement.totalDueCents - statement.paidAmountCents
                  );
                  return (
                    <Tr key={statement.id}>
                      <Td>
                        <Link
                          href={`/tenant/statements/${statement.id}`}
                          className="font-medium text-primary hover:text-primary-hover hover:underline"
                        >
                          {statement.statementNumber}
                        </Link>
                      </Td>
                      <Td>{monthLabel}</Td>
                      <Td className="text-muted">
                        {statement.dueDate.toLocaleDateString("en-CA")}
                      </Td>
                      <Td>
                        <PaymentStatusBadge {...statement} />
                      </Td>
                      <Td className="text-right tabular-nums">
                        {statement.status === "paid" ? "—" : formatMoney(outstanding)}
                      </Td>
                      {onlinePayments && (
                        <Td className="text-right">
                          {payableIds.has(statement.id) ? (
                            <TenantPayButton
                              statementId={statement.id}
                              label="Pay"
                              variant="outline"
                              size="sm"
                              className="inline-block"
                            />
                          ) : (
                            "—"
                          )}
                        </Td>
                      )}
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
