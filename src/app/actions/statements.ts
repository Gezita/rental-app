"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseMoneyToCents } from "@/lib/money";
import { requireStatement } from "@/lib/ownership";

export async function generateStatementsAction(formData: FormData) {
  const user = await requireUser();
  const propertyId = String(formData.get("propertyId") || "");
  const month = parseInt(String(formData.get("month") || "1"), 10);
  const year = parseInt(String(formData.get("year") || new Date().getFullYear()), 10);

  const { generateStatementsForProperty } = await import("@/lib/statements");
  await generateStatementsForProperty(user.id, propertyId, month, year);

  revalidatePath("/statements");
  redirect("/statements?generated=1");
}

export async function sendStatementAction(statementId: string) {
  const user = await requireUser();
  const { sendStatementById } = await import("@/lib/statement-send");
  await sendStatementById(statementId, user.id);
  revalidatePath(`/statements/${statementId}`);
  revalidatePath("/statements");
}

export async function recordStatementPaymentAction(statementId: string, formData: FormData) {
  const user = await requireUser();
  const statement = await requireStatement(user.id, statementId);

  const paymentDate = new Date(String(formData.get("paymentDate") || new Date()));
  const paymentMethod = String(formData.get("paymentMethod") || "e_transfer");
  const referenceNumber = String(formData.get("referenceNumber") || "").trim() || undefined;
  const amountInput = String(formData.get("amount") || "").trim();
  const paymentType = String(formData.get("paymentType") || "full");

  const outstanding = statement.totalDueCents - statement.paidAmountCents;
  let amountCents = outstanding > 0 ? outstanding : statement.totalDueCents;

  if (paymentType === "partial") {
    if (!amountInput) {
      redirect(`/statements/${statementId}?error=amount_required`);
    }
    amountCents = parseMoneyToCents(amountInput);
  }

  const { recordStatementPayment } = await import("@/lib/record-payment");
  const result = await recordStatementPayment({
    statementId,
    userId: user.id,
    amountCents,
    paymentDate,
    paymentMethod: paymentMethod as
      | "e_transfer"
      | "cash"
      | "cheque"
      | "bank_deposit"
      | "stripe"
      | "other",
    referenceNumber,
  });

  revalidatePath(`/statements/${statementId}`);
  revalidatePath("/statements");
  redirect(
    `/statements/${statementId}?paid=1&partial=${result.isFullyPaid ? "0" : "1"}`
  );
}

/** @deprecated Use recordStatementPaymentAction */
export async function markStatementPaidAction(statementId: string, formData: FormData) {
  const updated = new FormData();
  for (const [key, value] of formData.entries()) {
    updated.append(key, value);
  }
  updated.set("paymentType", "full");
  return recordStatementPaymentAction(statementId, updated);
}

export async function runAutoBillingAction() {
  const user = await requireUser();
  const { runAutoBillingForUser } = await import("@/lib/auto-billing");
  const result = await runAutoBillingForUser(user.id, { force: true });
  revalidatePath("/dashboard");
  revalidatePath("/statements");
  revalidatePath("/settings");
  redirect(
    `/settings?autoBilling=1&generated=${result.generated}&sent=${result.sent}&skipped=${result.skipped}`
  );
}

export async function sendReceiptEmailAction(receiptId: string) {
  const user = await requireUser();
  const receipt = await prisma.receipt.findFirst({
    where: {
      id: receiptId,
      payment: {
        statement: {
          unit: { property: { userId: user.id } },
        },
      },
    },
    include: {
      payment: {
        include: {
          statement: {
            include: {
              tenant: true,
              unit: true,
            },
          },
        },
      },
      pdfDocument: true,
    },
  });

  if (!receipt) throw new Error("Receipt not found");
  const tenant = receipt.payment.statement.tenant;
  if (!tenant.email) throw new Error("Tenant email is required");

  const settings = user.settings;
  const landlordName = settings?.landlordName || user.name || user.email;
  const { MONTH_NAMES } = await import("@/lib/statements");
  const { formatMoney } = await import("@/lib/money");
  const { sendEmail } = await import("@/lib/email");
  const { buildReceiptEmailContent, buildPartialPaymentEmailContent } = await import(
    "@/lib/tenant-communications"
  );

  const statement = receipt.payment.statement;
  const monthLabel = `${MONTH_NAMES[statement.statementMonth - 1]} ${statement.statementYear}`;
  const outstanding = Math.max(0, statement.totalDueCents - statement.paidAmountCents);
  const isPartial = outstanding > 0;

  const emailContent = isPartial
    ? buildPartialPaymentEmailContent({
        tenantName: tenant.firstName,
        monthLabel,
        paymentAmount: formatMoney(receipt.payment.amountCents),
        paymentDate: receipt.payment.paymentDate.toLocaleDateString("en-CA"),
        totalDue: formatMoney(statement.totalDueCents),
        outstandingBalance: formatMoney(outstanding),
        landlordName,
        landlordEmail: user.email,
      })
    : buildReceiptEmailContent({
        tenantName: tenant.firstName,
        monthLabel,
        paymentAmount: formatMoney(receipt.payment.amountCents),
        paymentDate: receipt.payment.paymentDate.toLocaleDateString("en-CA"),
        landlordName,
        landlordEmail: user.email,
      });

  await sendEmail({
    to: tenant.email,
    subject: emailContent.subject,
    body: emailContent.text,
    html: emailContent.html,
    attachmentName: receipt.pdfDocument?.fileName,
  });

  await prisma.receipt.update({
    where: { id: receiptId },
    data: { emailSentAt: new Date() },
  });

  revalidatePath(`/statements/${statement.id}`);
}
