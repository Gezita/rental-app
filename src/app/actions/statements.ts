"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireStatement } from "@/lib/ownership";
import {
  zMonth,
  zOptionalCents,
  zOptionalDate,
  zOptionalString,
  zPaymentMethod,
  zRequiredString,
  zYear,
} from "@/lib/validation";

// ── Schemas ──────────────────────────────────────────────────────────────────

const generateStatementsSchema = z.object({
  propertyId: zRequiredString,
  month: zMonth,
  year: zYear,
});

const createPastStatementSchema = z
  .object({
    unitId: zRequiredString,
    month: zMonth,
    year: zYear,
    paymentStatus: z.enum(["unpaid", "paid", "partial"]).default("unpaid"),
    paymentMethod: zPaymentMethod,
    paymentDate: zOptionalDate,
    partialAmount: zOptionalCents,
  })
  .refine(
    (d) => d.paymentStatus !== "partial" || (d.partialAmount !== undefined && d.partialAmount > 0),
    { message: "Partial payment requires an amount", path: ["partialAmount"] }
  );

const recordPaymentSchema = z.object({
  paymentType: z.enum(["full", "partial"]).default("full"),
  amount: zOptionalCents,
  paymentDate: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : undefined),
    z.string().transform((v) => new Date(v)).optional()
  ),
  paymentMethod: zPaymentMethod,
  referenceNumber: zOptionalString,
});

// ── Actions ───────────────────────────────────────────────────────────────────

export async function getUtilityBillsForMonthAction(
  propertyId: string,
  month: number,
  year: number
) {
  const user = await requireUser();
  const { getUtilityBillsForGenerate } = await import("@/lib/statement-extras");
  return getUtilityBillsForGenerate(user.id, propertyId, month, year);
}

export async function generateStatementsAction(formData: FormData) {
  const user = await requireUser();

  const parsed = generateStatementsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/statements/generate?error=Invalid%20form%20data");
  }

  const { propertyId, month, year } = parsed.data;
  const unitIds = formData.getAll("unitIds").map(String).filter(Boolean);

  try {
    const {
      prepareUtilityBillsFromForm,
      parseExtraCostsFromForm,
      extraCostsToLineItems,
    } = await import("@/lib/statement-extras");

    await prepareUtilityBillsFromForm(user.id, propertyId, month, year, formData);

    const primaryUnitId = unitIds.length === 1 ? unitIds[0] : undefined;
    const extraCosts = await parseExtraCostsFromForm(user.id, propertyId, primaryUnitId, formData);
    const extraLineItems = extraCostsToLineItems(extraCosts);
    const defaultExtras = extraLineItems.length > 0 ? { extraLineItems } : undefined;

    const { generateStatementsForProperty } = await import("@/lib/statements");
    const statements = await generateStatementsForProperty(
      user.id,
      propertyId,
      month,
      year,
      unitIds,
      { defaultExtras }
    );

    if (statements.length === 0) {
      redirect(
        "/statements/generate?error=No%20statements%20created.%20Select%20units%20with%20active%20tenants."
      );
    }

    const unitNames = statements.map((s) => s.unit.name).join(", ");
    revalidatePath("/statements");
    revalidatePath("/statements/generate");
    redirect(`/statements?generated=1&units=${encodeURIComponent(unitNames)}`);
  } catch (error) {
    const message = encodeURIComponent(
      error instanceof Error ? error.message : "Could not generate statements"
    );
    redirect(`/statements/generate?error=${message}`);
  }
}

export async function createPastStatementAction(formData: FormData) {
  const user = await requireUser();

  const parsed = createPastStatementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid form data";
    redirect(`/statements/generate?error=${encodeURIComponent(firstError)}`);
  }

  const { unitId, month, year, paymentStatus, paymentMethod, paymentDate, partialAmount } =
    parsed.data;

  let initialPayment:
    | { status: "unpaid" }
    | { status: "paid"; paymentDate: Date; paymentMethod: typeof paymentMethod }
    | { status: "partial"; amountCents: number; paymentDate: Date; paymentMethod: typeof paymentMethod };

  if (paymentStatus === "unpaid") {
    initialPayment = { status: "unpaid" };
  } else if (paymentStatus === "paid") {
    initialPayment = {
      status: "paid",
      paymentDate: paymentDate ?? new Date(),
      paymentMethod,
    };
  } else {
    initialPayment = {
      status: "partial",
      amountCents: partialAmount!,
      paymentDate: paymentDate ?? new Date(),
      paymentMethod,
    };
  }

  const { createPastStatementForUnit } = await import("@/lib/past-statements");
  const statement = await createPastStatementForUnit(user.id, {
    unitId,
    month,
    year,
    initialPayment,
    markAsSent: true,
  });

  revalidatePath("/statements");
  revalidatePath(`/statements/${statement!.id}`);
  redirect(`/statements/${statement!.id}?created=past`);
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

  const parsed = recordPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/statements/${statementId}?error=invalid`);
  }

  const { paymentType, amount, paymentDate, paymentMethod, referenceNumber } = parsed.data;

  const outstanding = statement.totalDueCents - statement.paidAmountCents;
  if (outstanding <= 0) {
    redirect(`/statements/${statementId}?error=already_paid`);
  }

  if (paymentType === "partial" && !amount) {
    redirect(`/statements/${statementId}?error=amount_required`);
  }

  const amountCents = paymentType === "partial" ? amount! : outstanding;

  const { recordStatementPayment } = await import("@/lib/record-payment");
  const result = await recordStatementPayment({
    statementId,
    userId: user.id,
    amountCents,
    paymentDate: paymentDate ?? new Date(),
    paymentMethod,
    referenceNumber,
  });

  revalidatePath(`/statements/${statementId}`);
  revalidatePath("/statements");
  redirect(`/statements/${statementId}?paid=1&partial=${result.isFullyPaid ? "0" : "1"}`);
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

export async function refreshStatementAction(statementId: string) {
  const user = await requireUser();

  try {
    const { refreshStatement } = await import("@/lib/statements");
    await refreshStatement(user.id, statementId);
  } catch (error) {
    const message = encodeURIComponent(
      error instanceof Error ? error.message : "Could not refresh statement"
    );
    redirect(`/statements/${statementId}?error=${message}`);
  }

  revalidatePath(`/statements/${statementId}`);
  revalidatePath("/statements");
  revalidatePath("/dashboard");
  redirect(`/statements/${statementId}?refreshed=1`);
}

export async function deleteStatementAction(statementId: string, formData: FormData) {
  const user = await requireUser();
  const statement = await requireStatement(user.id, statementId);

  const confirm = String(formData.get("confirm") || "").trim();
  if (confirm !== statement.statementNumber) {
    redirect(`/statements/${statementId}?error=delete_confirm`);
  }

  await prisma.statement.delete({ where: { id: statementId } });

  revalidatePath("/statements");
  revalidatePath("/dashboard");
  redirect("/statements?deleted=1");
}

export async function sendReceiptEmailAction(receiptId: string) {
  const user = await requireUser();
  const receipt = await prisma.receipt.findFirst({
    where: {
      id: receiptId,
      payment: { statement: { unit: { property: { userId: user.id } } } },
    },
    include: {
      payment: {
        include: { statement: { include: { tenant: true, unit: true } } },
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
