import Link from "next/link";
import { requireTenant, getTenantLandlordName } from "@/lib/tenant-auth";
import { getTenantPortalSummary } from "@/lib/tenant-portal";
import { formatMoney } from "@/lib/money";
import { MONTH_NAMES } from "@/lib/billing-constants";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { StatGroup } from "@/components/dashboard/stat-group";
import {
  getPrimaryPayableStatement,
  isTenantOnlinePaymentsEnabled,
} from "@/lib/tenant-payments";
import { TenantPayButton } from "@/components/tenant-stripe-buttons";
import {
  ButtonLink,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";

export default async function TenantHomePage() {
  const tenant = await requireTenant();
  const summary = await getTenantPortalSummary(tenant.id);
  const landlordName = getTenantLandlordName(tenant);
  const onlinePayments = isTenantOnlinePaymentsEnabled(tenant);
  const primaryPayable = await getPrimaryPayableStatement(tenant.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your home</h1>
        <p className="mt-1 text-sm text-muted">
          {tenant.unit.property.name} — {tenant.unit.name} · {landlordName}
        </p>
      </div>

      <StatGroup
        items={[
          {
            label: "Balance due",
            value: formatMoney(summary.outstandingCents),
            valueClassName: summary.outstandingCents > 0 ? "text-warning" : "text-success",
          },
          {
            label: "Statements",
            value: String(summary.statementCount),
          },
          {
            label: "Overdue",
            value: String(summary.overdueCount),
            valueClassName: summary.overdueCount > 0 ? "text-danger" : undefined,
          },
        ]}
      />

      {summary.outstandingCents > 0 && (
        <Card className="border-primary/20 bg-primary-muted/30">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Payment due</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {formatMoney(summary.outstandingCents)}
              </p>
              <p className="mt-1 text-sm text-muted">
                {summary.overdueCount > 0
                  ? `${summary.overdueCount} overdue statement${summary.overdueCount === 1 ? "" : "s"}`
                  : "Pay before the due date to avoid late fees"}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[200px]">
              {onlinePayments && primaryPayable ? (
                <TenantPayButton statementId={primaryPayable.id} label="Pay now" />
              ) : (
                <ButtonLink href="/tenant/payments" variant="default">
                  View payment options
                </ButtonLink>
              )}
              <ButtonLink href="/tenant/payments" variant="outline" size="sm">
                Manage auto-pay
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
      )}

      {summary.outstandingCents === 0 && onlinePayments && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">Set up auto-pay</p>
              <p className="text-sm text-muted">
                Save a card and pay future statements automatically.
              </p>
            </div>
            <ButtonLink href="/tenant/payments" variant="outline" className="shrink-0">
              Payment settings
            </ButtonLink>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Recent statements</CardTitle>
            <CardDescription>Rent and utility charges from your landlord</CardDescription>
          </div>
          <ButtonLink href="/tenant/statements" variant="outline" size="sm">
            View all
          </ButtonLink>
        </CardHeader>
        <CardContent>
          {summary.recentStatements.length === 0 ? (
            <p className="text-sm text-muted">No statements yet. Check back after your landlord sends your first bill.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Period</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {summary.recentStatements.map((statement) => {
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
                          {monthLabel}
                        </Link>
                      </Td>
                      <Td className="text-muted">
                        {statement.dueDate.toLocaleDateString("en-CA")}
                      </Td>
                      <Td>
                        <PaymentStatusBadge {...statement} />
                      </Td>
                      <Td className="text-right tabular-nums">
                        {statement.status === "paid" ? "Paid" : formatMoney(outstanding)}
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
