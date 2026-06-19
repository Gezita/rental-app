"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, parseMoneyToCents } from "@/lib/money";
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

export type MissingUtilityBillsWarning = {
  propertyId: string;
  propertyName: string;
  missingLabels: string[];
};

export async function previewUtilityBillSplitsAction(
  propertyId: string,
  utilityType: string,
  amount: string
) {
  const user = await requireUser();
  const { requireProperty } = await import("@/lib/ownership");
  const { parseUtilityType } = await import("@/lib/validation");
  const { computeUtilitySplitPreview } = await import("@/lib/utility-split-preview");

  await requireProperty(user.id, propertyId);
  const parsedType = parseUtilityType(utilityType);
  if (!parsedType) return { rows: [], totalAmountCents: 0 };

  const amountCents = parseMoneyToCents(amount || "0");
  if (amountCents <= 0) return { rows: [], totalAmountCents: 0 };

  const units = await prisma.unit.findMany({
    where: { propertyId },
    include: { utilityRules: true },
    orderBy: { name: "asc" },
  });

  return {
    rows: computeUtilitySplitPreview(amountCents, parsedType, units),
    totalAmountCents: amountCents,
  };
}

export async function previewStatementsAction(
  propertyId: string,
  month: number,
  year: number,
  unitIds: string[]
) {
  const user = await requireUser();
  const { previewStatementsForUnits } = await import("@/lib/statement-preview");

  if (unitIds.length === 0) return [];

  if (propertyId === "all") {
    const units = await prisma.unit.findMany({
      where: {
        id: { in: unitIds },
        property: { members: { some: { userId: user.id } } },
      },
      select: { id: true },
    });
    return previewStatementsForUnits(
      user.id,
      units.map((unit) => unit.id),
      month,
      year
    );
  }

  const { requireProperty } = await import("@/lib/ownership");
  await requireProperty(user.id, propertyId);

  return previewStatementsForUnits(user.id, unitIds, month, year);
}

export async function getUtilitySplitValidationAction(propertyId: string) {
  const user = await requireUser();
  const { requireProperty } = await import("@/lib/ownership");
  const { getUtilitySplitValidationIssues } = await import("@/lib/utility-split-validation");

  await requireProperty(user.id, propertyId);
  return getUtilitySplitValidationIssues(propertyId);
}

export async function getMissingUtilityBillsWarningsAction(
  propertyId: string,
  month: number,
  year: number
): Promise<MissingUtilityBillsWarning[]> {
  const user = await requireUser();
  const { getUtilityBillsForGenerate } = await import("@/lib/statement-extras");
  const { UTILITY_TYPE_LABELS } = await import("@/lib/billing-constants");
  const { requireProperty } = await import("@/lib/ownership");

  const properties =
    propertyId === "all"
      ? await prisma.property.findMany({
          where: { members: { some: { userId: user.id } } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [
          await requireProperty(user.id, propertyId).then((property) => ({
            id: property.id,
            name: property.name,
          })),
        ];

  const warnings: MissingUtilityBillsWarning[] = [];

  for (const property of properties) {
    const bills = await getUtilityBillsForGenerate(user.id, property.id, month, year);
    const missingLabels = bills
      .filter((bill) => bill.status === "missing")
      .map((bill) => UTILITY_TYPE_LABELS[bill.utilityType]);

    if (missingLabels.length > 0) {
      warnings.push({
        propertyId: property.id,
        propertyName: property.name,
        missingLabels,
      });
    }
  }

  return warnings;
}

export async function generateStatementsAction(formData: FormData) {
  const user = await requireUser();

  const parsed = generateStatementsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/billing/statements/generate?error=Invalid%20form%20data");
  }

  const { propertyId, month, year } = parsed.data;
  const unitIds = formData.getAll("unitIds").map(String).filter(Boolean);
  const generateAll = propertyId === "all";

  let successUrl: string | undefined;
  let errorMessage: string | undefined;

  try {
    const {
      prepareUtilityBillsFromForm,
      parseExtraCostsFromForm,
      extraCostsToLineItems,
    } = await import("@/lib/statement-extras");

    if (!generateAll) {
      await prepareUtilityBillsFromForm(user.id, propertyId, month, year, formData);
    }

    const primaryUnitId = unitIds.length === 1 ? unitIds[0] : undefined;
    const extraCosts = generateAll
      ? []
      : await parseExtraCostsFromForm(user.id, propertyId, primaryUnitId, formData);
    const extraLineItems = extraCostsToLineItems(extraCosts);
    const defaultExtras = extraLineItems.length > 0 ? { extraLineItems } : undefined;

    const { generateStatementsForProperty } = await import("@/lib/statements");

    const propertyIds = generateAll
      ? (
          await prisma.property.findMany({
            where: { members: { some: { userId: user.id } } },
            select: { id: true },
            orderBy: { name: "asc" },
          })
        ).map((property) => property.id)
      : [propertyId];

    const statements = [];
    for (const id of propertyIds) {
      const created = await generateStatementsForProperty(
        user.id,
        id,
        month,
        year,
        unitIds,
        { defaultExtras }
      );
      statements.push(...created);
    }

    if (statements.length === 0) {
      errorMessage = "No statements created. Select units with active tenants.";
    } else {
      const unitNames = statements.map((statement) => statement.unit.name).join(", ");
      revalidatePath("/billing/statements");
      revalidatePath("/billing/statements/generate");
      successUrl = `/billing/statements?generated=1&units=${encodeURIComponent(unitNames)}`;
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not generate statements";
  }

  if (errorMessage) {
    redirect(`/billing/statements/generate?error=${encodeURIComponent(errorMessage)}`);
  }
  if (successUrl) {
    redirect(successUrl);
  }
}

export async function createPastStatementAction(formData: FormData) {
  const user = await requireUser();

  const parsed = createPastStatementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid form data";
    redirect(`/billing/statements/generate?error=${encodeURIComponent(firstError)}`);
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
    if (!partialAmount) {
      redirect("/billing/statements/generate?error=Partial%20payment%20requires%20an%20amount");
    }
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

  revalidatePath("/billing/statements");
  revalidatePath(`/billing/statements/${statement!.id}`);
  redirect(`/billing/statements/${statement!.id}?created=past`);
}

export async function generateDraftStatementPdfAction(statementId: string) {
  const user = await requireUser();
  const statement = await requireStatement(user.id, statementId);

  if (statement.status === "cancelled") {
    redirect(`/billing/statements/${statementId}?error=${encodeURIComponent("Cancelled statements cannot be previewed")}`);
  }

  const full = await prisma.statement.findFirst({
    where: { id: statementId, unit: { property: { members: { some: { userId: user.id } } } } },
    include: {
      tenant: true,
      unit: { include: { property: true } },
      lineItems: true,
    },
  });
  if (!full) throw new Error("Statement not found");

  const settings = user.settings;
  const landlordName = settings?.landlordName || user.name || user.email;
  const { MONTH_NAMES } = await import("@/lib/billing-constants");
  const { generateStatementPdf } = await import("@/lib/pdf");

  const monthLabel = `${MONTH_NAMES[full.statementMonth - 1]} ${full.statementYear}`;
  const propertyAddress = [
    full.unit.property.addressLine1,
    full.unit.property.city,
    full.unit.property.province,
  ]
    .filter(Boolean)
    .join(", ");

  const doc = await generateStatementPdf({
    userId: user.id,
    propertyId: full.unit.propertyId,
    unitId: full.unitId,
    tenantId: full.tenantId,
    statementId: full.id,
    landlordName,
    propertyAddress,
    unitName: full.unit.name,
    tenantName: `${full.tenant.firstName} ${full.tenant.lastName}`,
    statementNumber: full.statementNumber,
    statementMonth: monthLabel,
    issueDate: full.issueDate.toLocaleDateString("en-CA"),
    dueDate: full.dueDate.toLocaleDateString("en-CA"),
    lineItems: full.lineItems.map((li) => ({
      description: li.description,
      amountCents: li.amountCents,
      note: li.calculationNote ?? undefined,
    })),
    totalDueCents: full.totalDueCents,
    paymentInstructions: settings?.paymentInstructions ?? undefined,
    notes: full.notes ?? undefined,
  });

  await prisma.statement.update({
    where: { id: statementId },
    data: { pdfDocumentId: doc.id },
  });

  revalidatePath(`/billing/statements/${statementId}`);
  redirect(`/api/documents/${doc.id}`);
}

export async function sendStatementAction(statementId: string) {
  const user = await requireUser();
  const { sendStatementById } = await import("@/lib/statement-send");
  await sendStatementById(statementId, user.id);
  revalidatePath(`/billing/statements/${statementId}`);
  revalidatePath("/billing/statements");
  redirect(`/billing/statements/${statementId}?sent=1`);
}

export async function recordStatementPaymentAction(statementId: string, formData: FormData) {
  const user = await requireUser();
  const statement = await requireStatement(user.id, statementId);

  const parsed = recordPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/billing/statements/${statementId}?error=invalid`);
  }

  const { paymentType, amount, paymentDate, paymentMethod, referenceNumber } = parsed.data;

  const outstanding = statement.totalDueCents - statement.paidAmountCents;
  if (outstanding <= 0) {
    redirect(`/billing/statements/${statementId}?error=already_paid`);
  }

  if (paymentType === "partial" && !amount) {
    redirect(`/billing/statements/${statementId}?error=amount_required`);
  }

  const amountCents = paymentType === "partial" ? amount! : outstanding;
  if (paymentType === "partial" && amountCents > outstanding) {
    redirect(
      `/billing/statements/${statementId}?error=${encodeURIComponent(`Payment cannot exceed outstanding balance of ${formatMoney(outstanding)}`)}`
    );
  }

  const { recordStatementPayment } = await import("@/lib/record-payment");
  const result = await recordStatementPayment({
    statementId,
    userId: user.id,
    amountCents,
    paymentDate: paymentDate ?? new Date(),
    paymentMethod,
    referenceNumber,
  });

  revalidatePath(`/billing/statements/${statementId}`);
  revalidatePath("/billing/statements");
  redirect(
    `/billing/statements/${statementId}?paid=1&partial=${result.isFullyPaid ? "0" : "1"}`
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
  revalidatePath("/billing/statements");
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
    redirect(`/billing/statements/${statementId}?error=${message}`);
  }

  revalidatePath(`/billing/statements/${statementId}`);
  revalidatePath("/billing/statements");
  revalidatePath("/dashboard");
  redirect(`/billing/statements/${statementId}?refreshed=1`);
}

export async function deleteStatementAction(statementId: string, formData: FormData) {
  const user = await requireUser();
  const statement = await requireStatement(user.id, statementId);

  const confirm = String(formData.get("confirm") || "").trim();
  if (confirm !== statement.statementNumber) {
    redirect(`/billing/statements/${statementId}?error=delete_confirm`);
  }

  await prisma.statement.delete({ where: { id: statementId } });

  revalidatePath("/billing/statements");
  revalidatePath("/dashboard");
  redirect("/billing/statements?deleted=1");
}

export async function sendReceiptEmailAction(receiptId: string) {
  const user = await requireUser();
  const receipt = await prisma.receipt.findFirst({
    where: {
      id: receiptId,
      payment: { statement: { unit: { property: { members: { some: { userId: user.id } } } } } },
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
  const { MONTH_NAMES } = await import("@/lib/billing-constants");
  const { formatMoney } = await import("@/lib/money");
  const { sendEmail } = await import("@/server/emails/send");
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

  revalidatePath(`/billing/statements/${statement.id}`);
}
