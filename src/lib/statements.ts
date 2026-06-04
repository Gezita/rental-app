import { prisma } from "@/lib/db";
import type { UtilityType } from "@prisma/client";
import { formatMoney } from "@/lib/money";
import { createPayToken } from "@/lib/statement-send";

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

  await prisma.utilityBillSplit.deleteMany({
    where: { utilityBillId },
  });

  const splits = [];

  for (const unit of units) {
    const rule = unit.utilityRules.find((r) => r.utilityType === bill.utilityType);
    if (!rule || !rule.tenantPays || rule.includedInRent) continue;

    const percentage = rule.percentage;
    const amountCents = Math.round((bill.amountCents * percentage) / 100);

    if (amountCents <= 0) continue;

    const split = await prisma.utilityBillSplit.create({
      data: {
        utilityBillId,
        unitId: unit.id,
        percentage,
        amountCents,
        isOverride: false,
        notes: rule.notes,
      },
    });
    splits.push(split);
  }

  return splits;
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

const ROLL_FORWARD_STATUSES = ["sent", "overdue", "draft"] as const;

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

export async function generateStatementsForProperty(
  userId: string,
  propertyId: string,
  month: number,
  year: number
) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId },
    include: {
      units: {
        include: {
          tenants: { where: { isActive: true } },
          utilityRules: true,
        },
      },
    },
  });

  if (!property) throw new Error("Property not found");

  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59);

  const utilityBills = await prisma.utilityBill.findMany({
    where: {
      propertyId,
      billingPeriodStart: { lte: periodEnd },
      billingPeriodEnd: { gte: periodStart },
    },
    include: { splits: true, document: true },
  });

  const statements = [];

  for (const unit of property.units) {
    const activeTenant = unit.tenants[0];
    if (!activeTenant) continue;

    const existing = await prisma.statement.findUnique({
      where: {
        unitId_statementMonth_statementYear: {
          unitId: unit.id,
          statementMonth: month,
          statementYear: year,
        },
      },
    });

    if (existing && existing.status !== "draft" && existing.status !== "cancelled") {
      continue;
    }

    if (existing) {
      await prisma.statementLineItem.deleteMany({ where: { statementId: existing.id } });
      await prisma.statement.delete({ where: { id: existing.id } });
    }

    const priorOutstanding = await getPriorMonthOutstandingCents(unit.id, month, year);
    const previousBalanceCents = priorOutstanding.amountCents;
    const lineItems: {
      type: "rent" | "utility" | "previous_balance";
      description: string;
      amountCents: number;
      sourceUtilityBillId?: string;
      sourceDocumentId?: string;
      calculationNote?: string;
    }[] = [];

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

    const rentAmountCents = unit.rentAmountCents;
    const totalDueCents =
      rentAmountCents + utilityTotalCents + previousBalanceCents;

    const statementNumber = `ST-${year}${String(month).padStart(2, "0")}-${unit.id.slice(-4).toUpperCase()}`;
    const dueDate = new Date(year, month - 1, unit.rentDueDay);

    const statement = await prisma.statement.create({
      data: {
        unitId: unit.id,
        tenantId: activeTenant.id,
        statementNumber,
        statementMonth: month,
        statementYear: year,
        issueDate: new Date(),
        dueDate,
        rentAmountCents,
        utilityTotalCents,
        previousBalanceCents,
        totalDueCents,
        status: "draft",
        payToken: createPayToken(),
        lineItems: {
          create: lineItems.map((item) => ({
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

    statements.push(statement);
  }

  return statements;
}

function formatCents(cents: number): string {
  return formatMoney(cents);
}

export const UTILITY_TYPE_LABELS: Record<UtilityType, string> = {
  gas: "Gas",
  water: "Water",
  electricity: "Electricity",
  internet: "Internet",
  other: "Other",
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
