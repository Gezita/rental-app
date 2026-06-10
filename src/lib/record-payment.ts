import { prisma } from "@/lib/db";
import { generateReceiptPdf } from "@/lib/pdf";
import { MONTH_NAMES } from "@/lib/billing-constants";
import { sendEmail } from "@/server/emails/send";
import {
  buildPartialPaymentEmailContent,
  buildReceiptEmailContent,
} from "@/lib/tenant-communications";
import { formatMoney } from "@/lib/money";
import type { PaymentMethod } from "@prisma/client";

export async function recordStatementPayment(params: {
  statementId: string;
  userId: string;
  amountCents: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  sendReceiptEmail?: boolean;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    include: { settings: true },
  });
  if (!user) throw new Error("User not found");

  const statement = await prisma.statement.findFirst({
    where: { id: params.statementId, unit: { property: { userId: params.userId } } },
    include: {
      tenant: true,
      unit: { include: { property: true } },
      payments: true,
    },
  });

  if (!statement) throw new Error("Statement not found");
  if (params.amountCents <= 0) throw new Error("Payment amount must be greater than zero");

  const outstanding = Math.max(0, statement.totalDueCents - statement.paidAmountCents);
  if (params.amountCents > outstanding) {
    throw new Error(`Payment cannot exceed outstanding balance of ${formatMoney(outstanding)}`);
  }

  const newPaidTotal = statement.paidAmountCents + params.amountCents;
  const isFullyPaid = newPaidTotal >= statement.totalDueCents;
  const remainingBalance = Math.max(0, statement.totalDueCents - newPaidTotal);

  const payment = await prisma.payment.create({
    data: {
      statementId: params.statementId,
      amountCents: params.amountCents,
      paymentDate: params.paymentDate,
      paymentMethod: params.paymentMethod,
      referenceNumber: params.referenceNumber,
    },
  });

  const receiptNumber = `RC-${statement.statementNumber.replace("ST-", "")}-${payment.id.slice(-4).toUpperCase()}`;
  const landlordName = user.settings?.landlordName || user.name || user.email;
  const monthLabel = `${MONTH_NAMES[statement.statementMonth - 1]} ${statement.statementYear}`;
  const propertyAddress = [
    statement.unit.property.addressLine1,
    statement.unit.property.city,
  ].join(", ");

  const receipt = await prisma.receipt.create({
    data: {
      paymentId: payment.id,
      receiptNumber,
      issueDate: new Date(),
    },
  });

  const doc = await generateReceiptPdf({
    userId: user.id,
    propertyId: statement.unit.propertyId,
    unitId: statement.unitId,
    tenantId: statement.tenantId,
    paymentId: payment.id,
    receiptId: receipt.id,
    landlordName,
    propertyAddress,
    unitName: statement.unit.name,
    tenantName: `${statement.tenant.firstName} ${statement.tenant.lastName}`,
    receiptNumber,
    statementNumber: statement.statementNumber,
    paymentAmountCents: payment.amountCents,
    paymentDate: payment.paymentDate.toLocaleDateString("en-CA"),
    paymentMethod: payment.paymentMethod.replace("_", " "),
  });

  await prisma.receipt.update({
    where: { id: receipt.id },
    data: { pdfDocumentId: doc.id },
  });

  let nextStatus = statement.status;
  if (isFullyPaid) {
    nextStatus = "paid";
  } else if (newPaidTotal > 0) {
    nextStatus = "partial";
  } else if (statement.status === "draft") {
    nextStatus = "sent";
  }

  await prisma.statement.update({
    where: { id: params.statementId },
    data: {
      paidAmountCents: newPaidTotal,
      status: nextStatus,
      ...(isFullyPaid ? { stripeCheckoutSessionId: null, stripePaymentIntentId: null } : {}),
    },
  });

  if (params.sendReceiptEmail !== false && statement.tenant.email) {
    const emailContent = isFullyPaid
      ? buildReceiptEmailContent({
          tenantName: statement.tenant.firstName,
          monthLabel,
          paymentAmount: formatMoney(payment.amountCents),
          paymentDate: payment.paymentDate.toLocaleDateString("en-CA"),
          landlordName,
          landlordEmail: user.email,
        })
      : buildPartialPaymentEmailContent({
          tenantName: statement.tenant.firstName,
          monthLabel,
          paymentAmount: formatMoney(payment.amountCents),
          paymentDate: payment.paymentDate.toLocaleDateString("en-CA"),
          totalDue: formatMoney(statement.totalDueCents),
          outstandingBalance: formatMoney(remainingBalance),
          landlordName,
          landlordEmail: user.email,
        });

    try {
      await sendEmail({
        to: statement.tenant.email,
        subject: emailContent.subject,
        body: emailContent.text,
        html: emailContent.html,
        attachmentName: doc.fileName,
      });
      await prisma.receipt.update({
        where: { id: receipt.id },
        data: { emailSentAt: new Date() },
      });
    } catch (e) {
      console.error("[email] failed to send receipt:", e);
    }
  }

  return { payment, receipt, isFullyPaid, remainingBalanceCents: remainingBalance };
}
