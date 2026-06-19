import { prisma } from "@/lib/db";
import type { PaymentMethod, StatementStatus } from "@prisma/client";
import { MONTH_NAMES } from "@/lib/billing-constants";
import { generateStatementForUnit } from "@/lib/statements";
import { recordStatementPayment } from "@/lib/record-payment";

export type InitialPaymentInput = {
  status: "unpaid" | "paid" | "partial";
  amountCents?: number;
  paymentDate?: Date;
  paymentMethod?: PaymentMethod;
};

async function applyInitialPayment(
  statementId: string,
  userId: string,
  payment: InitialPaymentInput,
  totalDueCents: number
) {
  if (payment.status === "unpaid") return false;

  const statement = await prisma.statement.findUnique({ where: { id: statementId } });
  if (!statement) return false;

  const paymentDate = payment.paymentDate ?? new Date();
  const method = payment.paymentMethod || "e_transfer";

  if (statement.status === "draft") {
    await prisma.statement.update({
      where: { id: statementId },
      data: { status: "sent", issueDate: paymentDate },
    });
  }

  let amountCents = totalDueCents;
  if (payment.status === "partial") {
    amountCents = payment.amountCents ?? 0;
    if (amountCents <= 0) throw new Error("Partial payment requires an amount");
  }

  await recordStatementPayment({
    statementId,
    userId,
    amountCents,
    paymentDate,
    paymentMethod: method,
    sendReceiptEmail: false,
  });

  return true;
}

export async function createPastStatementForUnit(
  userId: string,
  params: {
    unitId: string;
    month: number;
    year: number;
    initialPayment?: InitialPaymentInput;
    markAsSent?: boolean;
  }
) {
  const unit = await prisma.unit.findFirst({
    where: { id: params.unitId, property: { members: { some: { userId } } } },
    include: {
      property: true,
      tenants: { where: { isActive: true } },
    },
  });

  if (!unit) throw new Error("Unit not found");
  if (!unit.tenants[0]) throw new Error("Unit has no active tenant");

  const existing = await prisma.statement.findUnique({
    where: {
      unitId_statementMonth_statementYear: {
        unitId: unit.id,
        statementMonth: params.month,
        statementYear: params.year,
      },
    },
  });

  if (existing && existing.status !== "draft" && existing.status !== "cancelled") {
    throw new Error(
      `Statement already exists for ${MONTH_NAMES[params.month - 1]} ${params.year} (${existing.status})`
    );
  }

  if (existing) {
    await prisma.statementLineItem.deleteMany({ where: { statementId: existing.id } });
    await prisma.statement.delete({ where: { id: existing.id } });
  }

  const { recalculatePropertyUtilitySplits } = await import("@/lib/statements");
  await recalculatePropertyUtilitySplits(unit.propertyId, {
    month: params.month,
    year: params.year,
  });

  const statement = await generateStatementForUnit(
    userId,
    unit.id,
    params.month,
    params.year
  );
  if (!statement) throw new Error("Failed to generate statement");

  const issueDate = new Date(params.year, params.month - 1, 1);
  const historicalStatus: StatementStatus = params.markAsSent !== false ? "sent" : "draft";

  await prisma.statement.update({
    where: { id: statement.id },
    data: { issueDate, status: historicalStatus },
  });

  if (params.initialPayment && params.initialPayment.status !== "unpaid") {
    await applyInitialPayment(statement.id, userId, params.initialPayment, statement.totalDueCents);
  }

  return prisma.statement.findUnique({
    where: { id: statement.id },
    include: { tenant: true, unit: { include: { property: true } }, payments: true },
  });
}
