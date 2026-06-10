import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getPaymentStatus, getOutstandingCents } from "@/lib/payment-status";
import { MONTH_NAMES } from "@/lib/billing-constants";
import { isStripeConfigured } from "@/lib/stripe";
import { PayWithStripeButton } from "@/components/pay-with-stripe-button";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export default async function TenantPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ payToken: string }>;
  searchParams: Promise<{ success?: string; cancelled?: string }>;
}) {
  const { payToken } = await params;
  const { success, cancelled } = await searchParams;

  const statement = await prisma.statement.findFirst({
    where: { payToken },
    include: {
      tenant: true,
      unit: { include: { property: { include: { user: { include: { settings: true } } } } } },
      lineItems: true,
    },
  });

  if (!statement) notFound();

  const settings = statement.unit.property.user.settings;
  const stripeReady =
    settings?.stripePaymentsEnabled && isStripeConfigured();
  const paymentInfo = getPaymentStatus(statement);
  const outstanding = getOutstandingCents(statement);
  const monthLabel = `${MONTH_NAMES[statement.statementMonth - 1]} ${statement.statementYear}`;
  const landlordName =
    settings?.landlordName ||
    statement.unit.property.user.name ||
    "Your landlord";

  return (
    <div className="min-h-screen bg-surface-muted px-4 py-12">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Pay your statement</h1>
          <p className="mt-1 text-muted">{landlordName}</p>
        </div>

        {success && (
          <Alert>
            Thank you — your payment was received. A receipt will be emailed to you if we have
            your email on file.
          </Alert>
        )}
        {cancelled && (
          <Alert variant="warning">Payment was cancelled. You can try again below.</Alert>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{statement.statementNumber}</CardTitle>
              <p className="text-sm text-muted">
                {statement.unit.property.name} · {statement.unit.name} · {monthLabel}
              </p>
            </div>
            <Badge variant={paymentInfo.variant}>{paymentInfo.label}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border-subtle p-4 text-sm">
              <p className="text-muted-foreground">
                Tenant: {statement.tenant.firstName} {statement.tenant.lastName}
              </p>
              <p className="mt-2 text-muted-foreground">
                Due date: {statement.dueDate.toLocaleDateString("en-CA")}
              </p>
              {statement.paidAmountCents > 0 && (
                <p className="mt-2 text-muted-foreground">
                  Paid so far: {formatMoney(statement.paidAmountCents)}
                </p>
              )}
              <p className="mt-3 text-2xl font-bold text-foreground">
                {paymentInfo.key === "paid" ? "Paid in full" : formatMoney(outstanding)}
              </p>
            </div>

            {paymentInfo.key !== "paid" && stripeReady && statement.payToken && (
              <PayWithStripeButton payToken={statement.payToken} />
            )}

            {paymentInfo.key !== "paid" && !stripeReady && (
              <Alert variant="warning">
                Online card payment is not available. Use the payment instructions from your
                statement email.
                {settings?.paymentInstructions && (
                  <p className="mt-2 whitespace-pre-wrap">{settings.paymentInstructions}</p>
                )}
              </Alert>
            )}

            {paymentInfo.key === "paid" && (
              <p className="text-center text-sm text-muted">
                This statement is fully paid. Contact {landlordName} if you have questions.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
