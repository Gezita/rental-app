import { requireTenant, getTenantLandlordName } from "@/lib/tenant-auth";
import {
  getPrimaryPayableStatement,
  getTenantAutoPayStatus,
  isTenantOnlinePaymentsEnabled,
  listPayableStatements,
  listTenantPaymentHistory,
} from "@/lib/tenant-payments";
import { formatMoney } from "@/lib/money";
import { MONTH_NAMES } from "@/lib/billing-constants";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { FlashAlert } from "@/components/flash-alert";
import { TenantPayButton, TenantSetupAutopayButton } from "@/components/tenant-stripe-buttons";
import { disableTenantAutoPayAction, enableTenantAutoPayAction } from "@/app/actions/tenant-payments";
import { SubmitButton } from "@/components/submit-button";
import {
  Alert,
  Badge,
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

export default async function TenantPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    autopay?: string;
    success?: string;
    cancelled?: string;
  }>;
}) {
  const tenant = await requireTenant();
  const params = await searchParams;
  const landlordName = getTenantLandlordName(tenant);
  const onlinePayments = isTenantOnlinePaymentsEnabled(tenant);
  const autoPay = getTenantAutoPayStatus(tenant);
  const [payable, primary, payments] = await Promise.all([
    listPayableStatements(tenant.id),
    getPrimaryPayableStatement(tenant.id),
    listTenantPaymentHistory(tenant.id),
  ]);

  const totalDue = payable.reduce((sum, s) => sum + s.outstandingCents, 0);

  const flashMessage =
    params.autopay === "success"
      ? "Your card was saved. Auto-pay is now enabled for future statements."
      : params.autopay === "enabled"
        ? "Auto-pay turned on."
        : params.autopay === "disabled"
          ? "Auto-pay turned off. Your card stays on file for manual payments."
          : params.autopay === "cancelled"
            ? "Auto-pay setup was cancelled."
            : params.success
              ? "Payment received — thank you."
              : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payments</h1>
        <p className="mt-1 text-sm text-muted">
          Pay your balance and manage auto-pay with {landlordName}
        </p>
      </div>

      {flashMessage && (
        <FlashAlert
          variant={params.autopay === "cancelled" ? "warning" : "info"}
          clearParams={["autopay", "success", "cancelled"]}
        >
          {flashMessage}
        </FlashAlert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Balance due</CardTitle>
            <CardDescription>
              {payable.length === 0
                ? "You are all caught up."
                : `${payable.length} statement${payable.length === 1 ? "" : "s"} with an outstanding balance`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-semibold tabular-nums text-foreground">
              {formatMoney(totalDue)}
            </p>
            {primary && (
              <p className="text-sm text-muted">
                Next due: {MONTH_NAMES[primary.statementMonth - 1]} {primary.statementYear} (
                {primary.dueDate.toLocaleDateString("en-CA")})
              </p>
            )}
            {onlinePayments && primary ? (
              <TenantPayButton
                statementId={primary.id}
                label={payable.length === 1 ? "Pay now" : "Pay oldest balance"}
              />
            ) : totalDue > 0 ? (
              <Alert variant="warning">
                Online card payment is not available. Contact {landlordName} for payment
                instructions.
                {tenant.unit.property.user.settings?.paymentInstructions && (
                  <p className="mt-2 whitespace-pre-wrap">
                    {tenant.unit.property.user.settings.paymentInstructions}
                  </p>
                )}
              </Alert>
            ) : (
              <p className="text-sm text-success">No payment needed right now.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Auto-pay</CardTitle>
                <CardDescription>
                  Automatically pay new statements when your landlord sends them.
                </CardDescription>
              </div>
              <Badge variant={autoPay.enabled ? "success" : "secondary"}>
                {autoPay.enabled ? "On" : "Off"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">{autoPay.label}</p>
            {!onlinePayments ? (
              <Alert variant="warning">
                Your landlord has not enabled online payments yet.
              </Alert>
            ) : autoPay.hasCard ? (
              <div className="space-y-3">
                {autoPay.enabled ? (
                  <form action={disableTenantAutoPayAction}>
                    <SubmitButton variant="outline" className="w-full" pendingLabel="Saving…">
                      Turn off auto-pay
                    </SubmitButton>
                  </form>
                ) : (
                  <form action={enableTenantAutoPayAction}>
                    <SubmitButton className="w-full" pendingLabel="Saving…">
                      Turn on auto-pay
                    </SubmitButton>
                  </form>
                )}
                <TenantSetupAutopayButton label="Update card on file" />
              </div>
            ) : (
              <TenantSetupAutopayButton />
            )}
            <p className="text-xs text-muted">
              Auto-pay charges your saved card when a new statement is sent. You will still receive
              email receipts.
            </p>
          </CardContent>
        </Card>
      </div>

      {payable.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pay a statement</CardTitle>
            <CardDescription>Choose a specific statement to pay online</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>Period</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Amount</Th>
                  {onlinePayments && <Th className="text-right">Pay</Th>}
                </tr>
              </thead>
              <tbody>
                {payable.map((statement) => {
                  const monthLabel = `${MONTH_NAMES[statement.statementMonth - 1]} ${statement.statementYear}`;
                  return (
                    <Tr key={statement.id}>
                      <Td className="font-medium">{monthLabel}</Td>
                      <Td className="text-muted">
                        {statement.dueDate.toLocaleDateString("en-CA")}
                      </Td>
                      <Td>
                        <PaymentStatusBadge {...statement} />
                      </Td>
                      <Td className="text-right tabular-nums">
                        {formatMoney(statement.outstandingCents)}
                      </Td>
                      {onlinePayments && (
                        <Td className="text-right">
                          <TenantPayButton
                            statementId={statement.id}
                            label="Pay"
                            variant="outline"
                            size="sm"
                            className="inline-block"
                          />
                        </Td>
                      )}
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>Recent payments recorded by your landlord</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted">No payments recorded yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Statement</Th>
                  <Th>Method</Th>
                  <Th className="text-right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const monthLabel = `${MONTH_NAMES[payment.statement.statementMonth - 1]} ${payment.statement.statementYear}`;
                  return (
                    <Tr key={payment.id}>
                      <Td>{payment.paymentDate.toLocaleDateString("en-CA")}</Td>
                      <Td>
                        {monthLabel}
                        <span className="block text-xs text-muted">
                          {payment.statement.statementNumber}
                        </span>
                      </Td>
                      <Td className="capitalize">{payment.paymentMethod.replace("_", " ")}</Td>
                      <Td className="text-right tabular-nums">
                        {formatMoney(payment.amountCents)}
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
