import type { StatementStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getOutstandingCents } from "@/lib/payment-status";
import { isStripeConfigured } from "@/lib/stripe";
import type { TenantSessionContext } from "@/lib/tenant-auth";
import { listTenantStatements } from "@/lib/tenant-portal";

export type PayableStatement = {
  id: string;
  statementNumber: string;
  statementMonth: number;
  statementYear: number;
  dueDate: Date;
  status: StatementStatus;
  totalDueCents: number;
  paidAmountCents: number;
  outstandingCents: number;
  payToken: string | null;
};

export function isTenantOnlinePaymentsEnabled(tenant: TenantSessionContext): boolean {
  const settings = tenant.unit.property.user.settings;
  return Boolean(settings?.stripePaymentsEnabled && isStripeConfigured());
}

export async function listPayableStatements(tenantId: string): Promise<PayableStatement[]> {
  const statements = await listTenantStatements(tenantId);

  return statements
    .map((statement) => ({
      id: statement.id,
      statementNumber: statement.statementNumber,
      statementMonth: statement.statementMonth,
      statementYear: statement.statementYear,
      dueDate: statement.dueDate,
      status: statement.status,
      totalDueCents: statement.totalDueCents,
      paidAmountCents: statement.paidAmountCents,
      outstandingCents: getOutstandingCents(statement),
      payToken: statement.payToken,
    }))
    .filter((statement) => statement.outstandingCents > 0)
    .sort((a, b) => {
      if (a.status === "overdue" && b.status !== "overdue") return -1;
      if (b.status === "overdue" && a.status !== "overdue") return 1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
}

export async function getPrimaryPayableStatement(tenantId: string) {
  const payable = await listPayableStatements(tenantId);
  return payable[0] ?? null;
}

export async function listTenantPaymentHistory(tenantId: string) {
  return prisma.payment.findMany({
    where: {
      statement: { tenantId },
    },
    include: {
      statement: {
        select: {
          statementNumber: true,
          statementMonth: true,
          statementYear: true,
        },
      },
    },
    orderBy: { paymentDate: "desc" },
    take: 20,
  });
}

export function getTenantAutoPayStatus(tenant: {
  autoPayEnabled: boolean;
  stripePaymentMethodId: string | null;
}) {
  if (tenant.autoPayEnabled && tenant.stripePaymentMethodId) {
    return { enabled: true, hasCard: true, label: "Auto-pay is on" };
  }
  if (tenant.stripePaymentMethodId) {
    return { enabled: false, hasCard: true, label: "Card saved — auto-pay is off" };
  }
  return { enabled: false, hasCard: false, label: "No card on file" };
}
