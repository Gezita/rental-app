import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { MONTH_NAMES } from "@/lib/statements";
import { getPaymentStatus, getOutstandingCents } from "@/lib/payment-status";
import { createPayToken, getStatementPayUrl, previewStatementEmail } from "@/lib/statement-send";
import { isStripeConfigured } from "@/lib/stripe";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import {
  deleteStatementAction,
  recordStatementPaymentAction,
  refreshStatementAction,
  sendReceiptEmailAction,
  sendStatementAction,
} from "@/app/actions/app";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { EmailHtmlPreview } from "@/components/email-html-preview";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { FlashAlert } from "@/components/flash-alert";
import { SubmitButton } from "@/components/submit-button";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";

export default async function StatementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ statementId: string }>;
  searchParams: Promise<{
    paid?: string;
    partial?: string;
    error?: string;
    created?: string;
    refreshed?: string;
  }>;
}) {
  const { statementId } = await params;
  const query = await searchParams;
  const user = await requireUser();

  const statement = await prisma.statement.findFirst({
    where: { id: statementId, unit: { property: { userId: user.id } } },
    include: {
      tenant: true,
      unit: { include: { property: true } },
      lineItems: true,
      payments: { include: { receipt: true }, orderBy: { paymentDate: "desc" } },
      pdfDocument: true,
    },
  });

  if (!statement) notFound();

  let payToken = statement.payToken;
  if (
    !payToken &&
    statement.status !== "draft" &&
    statement.status !== "cancelled"
  ) {
    payToken = createPayToken();
    await prisma.statement.update({
      where: { id: statement.id },
      data: { payToken },
    });
  }

  const settings = user.settings;
  const paymentInfo = getPaymentStatus(statement);
  const outstanding = getOutstandingCents(statement);
  const payUrl = payToken ? getStatementPayUrl(payToken) : null;
  const stripeReady = settings?.stripePaymentsEnabled && isStripeConfigured();
  const canRecordPayment =
    outstanding > 0 &&
    statement.status !== "cancelled" &&
    statement.status !== "paid";

  const monthLabel = `${MONTH_NAMES[statement.statementMonth - 1]} ${statement.statementYear}`;
  const sendStatement = sendStatementAction.bind(null, statementId);
  const recordPayment = recordStatementPaymentAction.bind(null, statementId);
  const refreshStatement = refreshStatementAction.bind(null, statementId);
  const deleteStatement = deleteStatementAction.bind(null, statementId);
  const canRefresh =
    statement.status !== "paid" && statement.status !== "cancelled";
  const emailPreview =
    statement.status === "draft" ? await previewStatementEmail(statementId, user.id) : null;

  const missingEmail = !statement.tenant.email && statement.status === "draft";
  const missingProof = statement.lineItems.some(
    (li) => li.type === "utility" && !li.sourceDocumentId
  );

  return (
    <div className="space-y-6">
      <PageBackNav parent={{ href: "/statements", label: "Statements" }} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {statement.unit.name} · {monthLabel}
          </h1>
          <p className="text-muted">
            {statement.unit.property.name} · {statement.statementNumber}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <PaymentStatusBadge
            status={statement.status}
            totalDueCents={statement.totalDueCents}
            paidAmountCents={statement.paidAmountCents}
            stripeCheckoutSessionId={statement.stripeCheckoutSessionId}
          />
          <span className="text-xs capitalize text-muted">{statement.status}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total due</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatMoney(statement.totalDueCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Paid</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-success">
              {formatMoney(statement.paidAmountCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Balance</p>
            <p
              className={`mt-1 text-2xl font-semibold tabular-nums ${
                outstanding > 0 ? "text-warning" : "text-muted"
              }`}
            >
              {outstanding > 0 ? formatMoney(outstanding) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {canRefresh && (
        <Card className="border-primary/25 bg-primary-muted/30">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
                <RefreshCw className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="font-medium text-foreground">Refresh statement</p>
                <p className="text-sm text-muted-foreground">
                  Rebuild from the latest rent, utility bills, unit rules, and prior-month balance.
                  Recorded payments are kept.
                </p>
              </div>
            </div>
            <form action={refreshStatement} className="shrink-0">
              <SubmitButton className="w-full sm:w-auto" pendingLabel="Updating…">
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                Update from latest data
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      )}

      {query.created === "past" && (
        <FlashAlert clearParams={["created"]}>
          Past statement created with the payment status you selected.
        </FlashAlert>
      )}
      {query.paid && (
        <FlashAlert clearParams={["paid", "partial"]}>
          {query.partial === "1"
            ? "Partial payment recorded. Receipt generated and emailed if tenant has an address on file."
            : "Payment recorded in full. Receipt generated."}
        </FlashAlert>
      )}
      {query.error === "amount_required" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Enter a partial payment amount.
        </FlashAlert>
      )}
      {query.error === "delete_confirm" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Confirmation did not match. Type the statement number exactly to delete.
        </FlashAlert>
      )}
      {query.refreshed && (
        <FlashAlert clearParams={["refreshed"]}>
          Statement updated from the latest rent, utility bills, and unit rules. Any saved PDF was
          cleared — send again or download a new PDF if needed.
        </FlashAlert>
      )}
      {query.error && query.error !== "delete_confirm" && query.error !== "amount_required" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          {decodeURIComponent(query.error)}
        </FlashAlert>
      )}
      {missingEmail && (
        <Alert variant="warning">Tenant email is missing — required before sending.</Alert>
      )}
      {missingProof && (
        <Alert variant="warning">
          Some utility charges have no linked bill proof document.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>Description</Th>
                  <Th>Note</Th>
                  <Th className="text-right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {statement.lineItems.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <div>{item.description}</div>
                      {item.sourceDocumentId && (
                        <Link
                          href={`/api/documents/${item.sourceDocumentId}`}
                          target="_blank"
                          className="text-xs text-primary hover:underline"
                        >
                          View attachment
                        </Link>
                      )}
                    </Td>
                    <Td className="text-sm text-muted">{item.calculationNote || "—"}</Td>
                    <Td className="text-right">{formatMoney(item.amountCents)}</Td>
                  </Tr>
                ))}
                <Tr>
                  <Td colSpan={2} className="font-bold">
                    Total Due
                  </Td>
                  <Td className="text-right font-bold">{formatMoney(statement.totalDueCents)}</Td>
                </Tr>
                {statement.paidAmountCents > 0 && (
                  <Tr>
                    <Td colSpan={2} className="font-medium text-green-700">
                      Paid to date
                    </Td>
                    <Td className="text-right font-medium text-green-700">
                      {formatMoney(statement.paidAmountCents)}
                    </Td>
                  </Tr>
                )}
                {outstanding > 0 && statement.paidAmountCents > 0 && (
                  <Tr>
                    <Td colSpan={2} className="font-medium text-amber-700">
                      Remaining balance
                    </Td>
                    <Td className="text-right font-medium text-amber-700">
                      {formatMoney(outstanding)}
                    </Td>
                  </Tr>
                )}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tenant</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">
                {statement.tenant.firstName} {statement.tenant.lastName}
              </p>
              <p className="text-muted">{statement.tenant.email || "No email"}</p>
              <p className="mt-2 text-muted">Due: {statement.dueDate.toLocaleDateString()}</p>
              {paymentInfo.key !== "paid" && paymentInfo.key !== "draft" && (
                <p className="mt-2 font-medium text-foreground">
                  Outstanding: {formatMoney(outstanding)}
                </p>
              )}
            </CardContent>
          </Card>

          {payUrl && canRecordPayment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tenant payment link</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="break-all text-xs text-muted-foreground">{payUrl}</p>
                {stripeReady ? (
                  <p className="text-xs text-muted">
                    Share this link so tenants can pay the remaining balance by card via Stripe.
                  </p>
                ) : (
                  <p className="text-xs text-muted">
                    Enable Stripe in settings to accept card payments on this link.
                  </p>
                )}
                <Link href={payUrl} target="_blank">
                  <Button variant="outline" size="sm" className="w-full">
                    Open pay page
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {statement.status === "draft" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Send Statement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={sendStatement}>
                  <SubmitButton className="w-full" disabled={!!missingEmail} pendingLabel="Sending…">
                    Send by Email
                  </SubmitButton>
                </form>
                <p className="text-xs text-muted">
                  Sends a professional HTML email with the statement PDF attached. Enable auto-send
                  on the 1st of each month in Settings.
                </p>
                {emailPreview && (
                  <EmailHtmlPreview html={emailPreview.html} subject={emailPreview.subject} />
                )}
              </CardContent>
            </Card>
          )}

          {statement.pdfDocument && (
            <Link href={`/api/documents/${statement.pdfDocument.id}`} target="_blank">
              <Button variant="outline" className="w-full">
                Download PDF
              </Button>
            </Link>
          )}

          {canRecordPayment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {statement.status === "draft" ? "Mark as paid" : "Record payment"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statement.status === "draft" && (
                  <p className="mb-3 text-xs text-muted">
                    Use this for open or past statements. Recording payment marks the statement as
                    sent and updates paid / partial status.
                  </p>
                )}
                <form action={recordPayment} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="paymentType">Payment type</Label>
                    <Select id="paymentType" name="paymentType" defaultValue="full">
                      <option value="full">Full remaining balance ({formatMoney(outstanding)})</option>
                      <option value="partial">Partial payment</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="amount">Partial amount</Label>
                    <Input
                      id="amount"
                      name="amount"
                      placeholder={`Max ${formatMoney(outstanding)}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input
                      id="paymentDate"
                      name="paymentDate"
                      type="date"
                      defaultValue={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="paymentMethod">Method</Label>
                    <Select id="paymentMethod" name="paymentMethod" defaultValue="e_transfer">
                      <option value="e_transfer">E-Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="bank_deposit">Bank Deposit</option>
                      <option value="stripe">Stripe (manual)</option>
                      <option value="other">Other</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="referenceNumber">Reference</Label>
                    <Input id="referenceNumber" name="referenceNumber" placeholder="Optional" />
                  </div>
                  <SubmitButton className="w-full" pendingLabel="Recording…">
                    Record Payment & Generate Receipt
                  </SubmitButton>
                </form>
              </CardContent>
            </Card>
          )}

          {statement.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statement.payments.map((payment) => {
                  const sendReceipt = payment.receipt
                    ? sendReceiptEmailAction.bind(null, payment.receipt.id)
                    : null;
                  return (
                    <div key={payment.id} className="rounded-lg border border-border p-3 text-sm">
                      <p className="font-medium">{formatMoney(payment.amountCents)}</p>
                      <p className="text-muted">
                        {payment.paymentDate.toLocaleDateString()} ·{" "}
                        {payment.paymentMethod.replace("_", " ")}
                      </p>
                      {payment.receipt?.pdfDocumentId && (
                        <div className="mt-2 space-y-2">
                          <Link
                            href={`/api/documents/${payment.receipt.pdfDocumentId}`}
                            target="_blank"
                          >
                            <Button variant="outline" size="sm" className="w-full">
                              Download Receipt
                            </Button>
                          </Link>
                          {sendReceipt &&
                            statement.tenant.email &&
                            !payment.receipt.emailSentAt && (
                              <form action={sendReceipt}>
                                <Button type="submit" variant="secondary" size="sm" className="w-full">
                                  Send Receipt by Email
                                </Button>
                              </form>
                            )}
                          {payment.receipt.emailSentAt && (
                            <p className="text-xs text-muted">
                              Receipt emailed {payment.receipt.emailSentAt.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-base text-red-900">Delete statement</CardTitle>
              <CardDescription>
                {statement.status === "draft"
                  ? "Remove this draft so you can regenerate it for the same month."
                  : "Permanently removes this statement and any recorded payments. Statement and receipt PDFs stay in your document library."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfirmDeleteForm
                action={deleteStatement}
                entityName={statement.statementNumber}
                buttonLabel="Delete statement"
                description="This cannot be undone. You can generate a new statement for this unit and month afterward."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
