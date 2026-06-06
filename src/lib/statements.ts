import { prisma } from "@/lib/db";
import type { StatementStatus } from "@prisma/client";
import { MONTH_NAMES, UTILITY_TYPE_LABELS } from "@/lib/billing-constants";
import { formatMoney } from "@/lib/money";
import { rentDueDate } from "@/lib/validation";
import { utilityBillsForStatementMonthWhere } from "@/lib/utility-bill-month";

export { MONTH_NAMES, UTILITY_TYPE_LABELS };

export async function calculateUtilitySplits(
  utilityBillId: string,
  propertyId: string
) {
  const bill = await prisma.utilityBill.findUnique({
    where: { id: utilityBillId },
    include: { splits: true },
  });

  if (!bill || bill.propertyId !== propertyId) {
    throw new Error("Utility bill not found");
  }

  const units = await prisma.unit.findMany({
    where: { propertyId },
    include: { utilityRules: true },
  });

  const splitData: {
    utilityBillId: string;
    unitId: string;
    percentage: number;
    amountCents: number;
    isOverride: boolean;
    notes: string | null;
  }[] = [];

  for (const unit of units) {
    const rule = unit.utilityRules.find((r) => r.utilityType === bill.utilityType);
    if (!rule || !rule.tenantPays || rule.includedInRent) continue;

    const percentage = rule.percentage;
    const amountCents = Math.round((bill.amountCents * percentage) / 100);

    if (amountCents <= 0) continue;

    splitData.push({
      utilityBillId,
      unitId: unit.id,
      percentage,
      amountCents,
      isOverride: false,
      notes: rule.notes,
    });
  }

  if (splitData.length > 0) {
    const allocated = splitData.reduce((sum, row) => sum + row.amountCents, 0);
    const remainder = bill.amountCents - allocated;
    if (remainder !== 0) {
      let largestIndex = 0;
      for (let i = 1; i < splitData.length; i += 1) {
        if (splitData[i].amountCents > splitData[largestIndex].amountCents) {
          largestIndex = i;
        }
      }
      splitData[largestIndex].amountCents += remainder;
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.utilityBillSplit.deleteMany({ where: { utilityBillId } });
    if (splitData.length === 0) return [];

    await tx.utilityBillSplit.createMany({ data: splitData });
    return tx.utilityBillSplit.findMany({ where: { utilityBillId } });
  });
}

export async function recalculatePropertyUtilitySplits(
  propertyId: string,
  options?: { month: number; year: number }
) {
  const bills = await prisma.utilityBill.findMany({
    where: options
      ? {
          propertyId,
          billMonth: options.month,
          billYear: options.year,
        }
      : { propertyId },
  });

  for (const bill of bills) {
    await calculateUtilitySplits(bill.id, propertyId);
  }
}

export function statementUnitSlug(unitName: string) {
  const slug = unitName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
  return slug || "UNIT";
}

export function buildStatementNumber(unitName: string, month: number, year: number) {
  return `ST-${year}${String(month).padStart(2, "0")}-${statementUnitSlug(unitName)}`;
}

export function getPriorStatementPeriod(month: number, year: number) {
  if (month === 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}

export function getStatementOutstandingCents(statement: {
  totalDueCents: number;
  paidAmountCents: number;
  status: string;
}): number {
  if (statement.status === "paid" || statement.status === "cancelled") return 0;
  return Math.max(0, statement.totalDueCents - statement.paidAmountCents);
}

const ROLL_FORWARD_STATUSES = ["sent", "overdue", "partial"] as const;

export async function getPriorMonthOutstandingCents(
  unitId: string,
  month: number,
  year: number
): Promise<{ amountCents: number; label: string; note?: string }> {
  const prior = getPriorStatementPeriod(month, year);

  const priorStatement = await prisma.statement.findUnique({
    where: {
      unitId_statementMonth_statementYear: {
        unitId,
        statementMonth: prior.month,
        statementYear: prior.year,
      },
    },
  });

  if (!priorStatement || !ROLL_FORWARD_STATUSES.includes(priorStatement.status as (typeof ROLL_FORWARD_STATUSES)[number])) {
    return { amountCents: 0, label: "" };
  }

  const amountCents = getStatementOutstandingCents(priorStatement);
  if (amountCents <= 0) return { amountCents: 0, label: "" };

  const label = `Outstanding balance — ${MONTH_NAMES[prior.month - 1]} ${prior.year}`;
  const note = `From ${priorStatement.statementNumber} (${formatMoney(amountCents)} remaining)`;

  return { amountCents, label, note };
}

type StatementLineItemInput = {
  type: "rent" | "utility" | "previous_balance" | "other";
  description: string;
  amountCents: number;
  sourceUtilityBillId?: string;
  sourceDocumentId?: string;
  calculationNote?: string;
};

export type StatementGenerationExtras = {
  extraLineItems?: StatementLineItemInput[];
};

async function buildStatementLineItems(
  unit: {
    id: string;
    name: string;
    rentAmountCents: number;
  },
  month: number,
  year: number,
  utilityBills: Awaited<ReturnType<typeof loadUtilityBillsForStatementMonth>>,
  extras?: StatementGenerationExtras
) {
  const priorOutstanding = await getPriorMonthOutstandingCents(unit.id, month, year);
  const previousBalanceCents = priorOutstanding.amountCents;
  const lineItems: StatementLineItemInput[] = [];

  lineItems.push({
    type: "rent",
    description: "Monthly Rent",
    amountCents: unit.rentAmountCents,
  });

  let utilityTotalCents = 0;

  for (const bill of utilityBills) {
    const split = bill.splits.find((s) => s.unitId === unit.id);
    if (!split) continue;

    const utilityLabel = bill.utilityType.charAt(0).toUpperCase() + bill.utilityType.slice(1);
    const provider = bill.providerName ? ` (${bill.providerName})` : "";
    const calculationNote = `${formatCents(bill.amountCents)} bill × ${split.percentage}%`;

    lineItems.push({
      type: "utility",
      description: `${utilityLabel}${provider}`,
      amountCents: split.amountCents,
      sourceUtilityBillId: bill.id,
      sourceDocumentId: bill.documentId ?? undefined,
      calculationNote,
    });

    utilityTotalCents += split.amountCents;
  }

  if (previousBalanceCents > 0) {
    lineItems.push({
      type: "previous_balance",
      description: priorOutstanding.label,
      amountCents: previousBalanceCents,
      calculationNote: priorOutstanding.note,
    });
  }

  let adjustmentTotalCents = 0;
  for (const extra of extras?.extraLineItems ?? []) {
    lineItems.push(extra);
    if (extra.type === "other") {
      adjustmentTotalCents += extra.amountCents;
    } else if (extra.type === "utility") {
      utilityTotalCents += extra.amountCents;
    }
  }

  const totalDueCents =
    unit.rentAmountCents + utilityTotalCents + previousBalanceCents + adjustmentTotalCents;

  return {
    lineItems,
    rentAmountCents: unit.rentAmountCents,
    utilityTotalCents,
    adjustmentTotalCents,
    previousBalanceCents,
    totalDueCents,
  };
}

export async function loadUtilityBillsForStatementMonth(
  propertyId: string,
  month: number,
  year: number
) {
  return prisma.utilityBill.findMany({
    where: utilityBillsForStatementMonthWhere(propertyId, month, year),
    include: { splits: true, document: true },
  });
}

async function replaceDraftStatement(
  unitId: string,
  month: number,
  year: number
) {
  const existing = await prisma.statement.findUnique({
    where: {
      unitId_statementMonth_statementYear: {
        unitId,
        statementMonth: month,
        statementYear: year,
      },
    },
  });

  if (existing && existing.status !== "draft" && existing.status !== "cancelled") {
    return { skipped: true as const, existing };
  }

  if (existing) {
    await prisma.statementLineItem.deleteMany({ where: { statementId: existing.id } });
    await prisma.statement.delete({ where: { id: existing.id } });
  }

  return { skipped: false as const, existing: null };
}

export async function generateStatementForUnit(
  userId: string,
  unitId: string,
  month: number,
  year: number,
  options?: {
    utilityBills?: Awaited<ReturnType<typeof loadUtilityBillsForStatementMonth>>;
    extras?: StatementGenerationExtras;
  }
) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { userId } },
    include: {
      property: true,
      tenants: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
      utilityRules: true,
    },
  });

  if (!unit) throw new Error("Unit not found");

  const activeTenant = unit.tenants[0];
  if (!activeTenant) return null;

  const replacement = await replaceDraftStatement(unit.id, month, year);
  if (replacement.skipped) return null;

  const utilityBills =
    options?.utilityBills ??
    (await loadUtilityBillsForStatementMonth(unit.propertyId, month, year));

  const totals = await buildStatementLineItems(unit, month, year, utilityBills, options?.extras);
  const dueDate = rentDueDate(year, month, unit.rentDueDay);

  return prisma.statement.create({
    data: {
      unitId: unit.id,
      tenantId: activeTenant.id,
      statementNumber: buildStatementNumber(unit.name, month, year),
      statementMonth: month,
      statementYear: year,
      issueDate: new Date(),
      dueDate,
      rentAmountCents: totals.rentAmountCents,
      utilityTotalCents: totals.utilityTotalCents,
      adjustmentTotalCents: totals.adjustmentTotalCents,
      previousBalanceCents: totals.previousBalanceCents,
      totalDueCents: totals.totalDueCents,
      status: "draft",
      payToken: (await import("@/lib/statement-send")).createPayToken(),
      lineItems: {
        create: totals.lineItems.map((item) => ({
          type: item.type,
          description: item.description,
          amountCents: item.amountCents,
          sourceUtilityBillId: item.sourceUtilityBillId,
          sourceDocumentId: item.sourceDocumentId,
          calculationNote: item.calculationNote,
        })),
      },
    },
    include: { lineItems: true, tenant: true, unit: { include: { property: true } } },
  });
}

export async function refreshStatement(userId: string, statementId: string) {
  const statement = await prisma.statement.findFirst({
    where: { id: statementId, unit: { property: { userId } } },
    include: {
      unit: {
        include: {
          property: true,
          tenants: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!statement) throw new Error("Statement not found");
  if (statement.status === "paid" || statement.status === "cancelled") {
    throw new Error("Paid and cancelled statements cannot be refreshed");
  }

  const activeTenant = statement.unit.tenants[0];
  if (!activeTenant) throw new Error("Unit has no active tenant");

  await recalculatePropertyUtilitySplits(statement.unit.propertyId, {
    month: statement.statementMonth,
    year: statement.statementYear,
  });

  const utilityBills = await loadUtilityBillsForStatementMonth(
    statement.unit.propertyId,
    statement.statementMonth,
    statement.statementYear
  );

  const totals = await buildStatementLineItems(
    statement.unit,
    statement.statementMonth,
    statement.statementYear,
    utilityBills,
    undefined
  );

  await prisma.statementLineItem.deleteMany({ where: { statementId } });

  const dueDate = rentDueDate(
    statement.statementYear,
    statement.statementMonth,
    statement.unit.rentDueDay
  );

  let nextStatus: StatementStatus = statement.status;
  if (statement.paidAmountCents >= totals.totalDueCents) {
    nextStatus = "paid";
  } else if (statement.paidAmountCents > 0) {
    nextStatus = "partial";
  } else if (dueDate < new Date() && statement.status !== "draft") {
    nextStatus = "overdue";
  }

  return prisma.statement.update({
    where: { id: statementId },
    data: {
      tenantId: activeTenant.id,
      statementNumber: buildStatementNumber(
        statement.unit.name,
        statement.statementMonth,
        statement.statementYear
      ),
      dueDate,
      rentAmountCents: totals.rentAmountCents,
      utilityTotalCents: totals.utilityTotalCents,
      adjustmentTotalCents: totals.adjustmentTotalCents,
      previousBalanceCents: totals.previousBalanceCents,
      totalDueCents: totals.totalDueCents,
      status: nextStatus,
      pdfDocumentId: null,
      lineItems: {
        create: totals.lineItems.map((item) => ({
          type: item.type,
          description: item.description,
          amountCents: item.amountCents,
          sourceUtilityBillId: item.sourceUtilityBillId,
          sourceDocumentId: item.sourceDocumentId,
          calculationNote: item.calculationNote,
        })),
      },
    },
    include: { lineItems: true, tenant: true, unit: { include: { property: true } } },
  });
}

export async function generateStatementsForProperty(
  userId: string,
  propertyId: string,
  month: number,
  year: number,
  unitIds?: string[],
  options?: {
    extrasByUnitId?: Record<string, StatementGenerationExtras>;
    defaultExtras?: StatementGenerationExtras;
  }
) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId },
    include: {
      units: {
        include: {
          tenants: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
          utilityRules: true,
        },
      },
    },
  });

  if (!property) throw new Error("Property not found");

  await recalculatePropertyUtilitySplits(propertyId, { month, year });
  const utilityBills = await loadUtilityBillsForStatementMonth(propertyId, month, year);

  const statements = [];
  const selectedUnitIds = unitIds?.length ? new Set(unitIds) : null;

  for (const unit of property.units) {
    if (selectedUnitIds && !selectedUnitIds.has(unit.id)) continue;

    const extras =
      options?.extrasByUnitId?.[unit.id] ?? options?.defaultExtras;

    const statement = await generateStatementForUnit(userId, unit.id, month, year, {
      utilityBills,
      extras,
    });
    if (statement) statements.push(statement);
  }

  return statements;
}

function formatCents(cents: number): string {
  return formatMoney(cents);
}
