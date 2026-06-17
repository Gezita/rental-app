import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireTenant, getTenantLandlordName } from "@/lib/tenant-auth";
import { requireTenantStatement } from "@/lib/tenant-portal";
import { formatMoney } from "@/lib/money";
import { getOutstandingCents, getPaymentStatus } from "@/lib/payment-status";
import { MONTH_NAMES } from "@/lib/billing-constants";
import { isTenantOnlinePaymentsEnabled } from "@/lib/tenant-payments";
import { TenantPayButton } from "@/components/tenant-stripe-buttons";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { FlashAlert } from "@/components/flash-alert";
import {
  Alert,
  ButtonLink,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";

export default async function TenantStatementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ statementId: string }>;
  searchParams: Promise<{ success?: string; cancelled?: string }>;
}) {
  const tenant = await requireTenant();
  const { statementId } = await params;
  const { success, cancelled } = await searchParams;
  const statement = await requireTenantStatement(statementId, tenant.id);

  const settings = statement.unit.property.user.settings;
  const onlinePayments = isTenantOnlinePaymentsEnabled(tenant);
  const paymentInfo = getPaymentStatus(statement);
  const outstanding = getOutstandingCents(statement);
  const monthLabel = `${MONTH_NAMES[statement.statementMonth - 1]} ${statement.statementYear}`;
  const landlordName = getTenantLandlordName(tenant);

  return (
    <div className="space-y-6">
      <Link
        href="/tenant/statements"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to statements
      </Link>

      {success && (
        <FlashAlert variant="info" clearParams={["success"]}>
          Thank you — your payment was received. A receipt will be emailed if we have your address on file.
        </FlashAlert>
      )}
      {cancelled && (
        <FlashAlert variant="warning" clearParams={["cancelled"]}>
          Payment was cancelled. You can try again below.
        </FlashAlert>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {monthLabel} statement
          </h1>
          <p className="mt-1 text-sm text-muted">
            {statement.statementNumber} · Due {statement.dueDate.toLocaleDateString("en-CA")}
          </p>
        </div>
        <PaymentStatusBadge {...statement} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Amount due</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border bg-surface-muted p-4">
            {statement.paidAmountCents > 0 && (
              <p className="text-sm text-muted">
                Paid so far: {formatMoney(statement.paidAmountCents)}
              </p>
            )}
            <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
              {paymentInfo.key === "paid" ? "Paid in full" : formatMoney(outstanding)}
            </p>
          </div>

          {paymentInfo.key !== "paid" && onlinePayments && statement.payToken && (
            <TenantPayButton statementId={statement.id} label="Pay with card" />
          )}

          {paymentInfo.key !== "paid" && !onlinePayments && (
            <Alert variant="warning">
              Online card payment is not available. Contact {landlordName} for payment instructions.
              {settings?.paymentInstructions && (
                <p className="mt-2 whitespace-pre-wrap">{settings.paymentInstructions}</p>
              )}
            </Alert>
          )}

          {statement.pdfDocument && (
            <ButtonLink
              href={`/api/tenant/documents/${statement.pdfDocument.id}`}
              variant="outline"
              target="_blank"
            >
              Download PDF
            </ButtonLink>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>Description</Th>
                <Th className="text-right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {statement.lineItems.map((item) => (
                <Tr key={item.id}>
                  <Td>{item.description}</Td>
                  <Td className="text-right tabular-nums">{formatMoney(item.amountCents)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {statement.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Method</Th>
                  <Th className="text-right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {statement.payments.map((payment) => (
                  <Tr key={payment.id}>
                    <Td>{payment.paymentDate.toLocaleDateString("en-CA")}</Td>
                    <Td className="capitalize">{payment.paymentMethod}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(payment.amountCents)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-muted">
        Questions? Contact {landlordName}
        {tenant.email ? (
          <>
            {" "}
            or reply to your statement email.
          </>
        ) : (
          "."
        )}
      </p>
    </div>
  );
}
