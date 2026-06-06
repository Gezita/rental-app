import type { UtilityType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseMoneyToCents } from "@/lib/money";
import { saveUploadedFile } from "@/lib/files";
import { calculateUtilitySplits, loadUtilityBillsForStatementMonth } from "@/lib/statements";
import { STATEMENT_UTILITY_TYPES } from "@/lib/billing-constants";

export type ExtraCostInput = {
  description: string;
  amountCents: number;
  documentId?: string;
};

export type StatementExtraLineItem = {
  type: "utility" | "other";
  description: string;
  amountCents: number;
  sourceDocumentId?: string;
  calculationNote?: string;
};

export type GenerateUtilityBillRow =
  | {
      status: "existing";
      id: string;
      utilityType: UtilityType;
      amountCents: number;
      providerName: string | null;
      hasDocument: boolean;
      documentFileName: string | null;
    }
  | {
      status: "missing";
      utilityType: (typeof STATEMENT_UTILITY_TYPES)[number];
    };

export async function getUtilityBillsForGenerate(
  userId: string,
  propertyId: string,
  month: number,
  year: number
): Promise<GenerateUtilityBillRow[]> {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId },
    select: { id: true },
  });
  if (!property) return [];

  const bills = await loadUtilityBillsForStatementMonth(propertyId, month, year);
  const byType = new Map(bills.map((bill) => [bill.utilityType, bill]));

  return STATEMENT_UTILITY_TYPES.map((utilityType) => {
    const bill = byType.get(utilityType);
    if (bill) {
      return {
        status: "existing" as const,
        id: bill.id,
        utilityType: bill.utilityType,
        amountCents: bill.amountCents,
        providerName: bill.providerName,
        hasDocument: Boolean(bill.documentId),
        documentFileName: bill.document?.fileName ?? null,
      };
    }
    return { status: "missing" as const, utilityType };
  });
}

export async function applyBillAttachmentsFromForm(
  userId: string,
  propertyId: string,
  formData: FormData
) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId },
    select: { id: true },
  });
  if (!property) return;

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("billFile_")) continue;
    const billId = key.slice("billFile_".length);
    if (!(value instanceof File) || value.size === 0) continue;

    const bill = await prisma.utilityBill.findFirst({
      where: { id: billId, propertyId },
    });
    if (!bill) continue;

    const doc = await saveUploadedFile(value, {
      userId,
      category: "utility_bill",
      propertyId,
    });

    await prisma.utilityBill.update({
      where: { id: billId },
      data: { documentId: doc.id },
    });
  }
}

export async function applyNewUtilityBillsFromForm(
  userId: string,
  propertyId: string,
  month: number,
  year: number,
  formData: FormData
) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId },
    select: { id: true },
  });
  if (!property) return;

  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);

  for (const utilityType of STATEMENT_UTILITY_TYPES) {
    const amountRaw = String(formData.get(`newBill_${utilityType}_amount`) || "").trim();
    const file = formData.get(`newBill_${utilityType}_file`);

    const hasFile = file instanceof File && file.size > 0;
    if (!amountRaw && !hasFile) continue;

    const existing = await prisma.utilityBill.findFirst({
      where: { propertyId, utilityType, billMonth: month, billYear: year },
    });
    if (existing) continue;

    if (!amountRaw) {
      throw new Error(`Enter an amount for the ${utilityType} bill, or skip that utility.`);
    }

    const amountCents = parseMoneyToCents(amountRaw);
    if (amountCents <= 0) {
      throw new Error(`${utilityType} bill amount must be greater than zero`);
    }

    let documentId: string | undefined;
    if (hasFile) {
      const doc = await saveUploadedFile(file as File, {
        userId,
        category: "utility_bill",
        propertyId,
      });
      documentId = doc.id;
    }

    const bill = await prisma.utilityBill.create({
      data: {
        propertyId,
        utilityType,
        amountCents,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        dueDate: periodEnd,
        billMonth: month,
        billYear: year,
        documentId,
        source: "manual",
      },
    });

    await calculateUtilitySplits(bill.id, propertyId);
  }
}

export async function prepareUtilityBillsFromForm(
  userId: string,
  propertyId: string,
  month: number,
  year: number,
  formData: FormData
) {
  await applyNewUtilityBillsFromForm(userId, propertyId, month, year, formData);
  await applyBillAttachmentsFromForm(userId, propertyId, formData);
}

export async function parseExtraCostsFromForm(
  userId: string,
  propertyId: string,
  unitId: string | undefined,
  formData: FormData
): Promise<ExtraCostInput[]> {
  const indices = new Set<number>();
  for (const key of formData.keys()) {
    const match = key.match(/^extraCost_(\d+)_description$/);
    if (match) indices.add(parseInt(match[1], 10));
  }

  const extras: ExtraCostInput[] = [];

  for (const index of [...indices].sort((a, b) => a - b)) {
    const description = String(formData.get(`extraCost_${index}_description`) || "").trim();
    const amountRaw = String(formData.get(`extraCost_${index}_amount`) || "").trim();
    const file = formData.get(`extraCost_${index}_file`);

    if (!description && !amountRaw) continue;
    if (!description) {
      throw new Error("Each extra cost needs a description");
    }
    if (!amountRaw) {
      throw new Error(`Enter an amount for "${description}"`);
    }

    const amountCents = parseMoneyToCents(amountRaw);
    if (amountCents <= 0) {
      throw new Error(`Amount for "${description}" must be greater than zero`);
    }

    let documentId: string | undefined;
    if (file instanceof File && file.size > 0) {
      const doc = await saveUploadedFile(file, {
        userId,
        category: "utility_bill",
        propertyId,
        unitId,
        notes: description,
      });
      documentId = doc.id;
    }

    extras.push({ description, amountCents, documentId });
  }

  return extras;
}

export function extraCostsToLineItems(extras: ExtraCostInput[]): StatementExtraLineItem[] {
  return extras.map((extra) => ({
    type: "other" as const,
    description: extra.description,
    amountCents: extra.amountCents,
    sourceDocumentId: extra.documentId,
    calculationNote: extra.documentId ? "Supporting document attached" : undefined,
  }));
}
