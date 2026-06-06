import {
  getOutstandingCents,
  getPaymentStatus,
  type PaymentStatusKey,
} from "@/lib/payment-status";
import type { StatementStatus } from "@prisma/client";

export type StatementForStats = {
  status: StatementStatus;
  totalDueCents: number;
  paidAmountCents: number;
  stripeCheckoutSessionId?: string | null;
};

export type StatementStats = {
  outstandingCents: number;
  collectedCents: number;
  counts: Record<PaymentStatusKey, number>;
};

export function aggregateStatementStats(statements: StatementForStats[]): StatementStats {
  const counts: Record<PaymentStatusKey, number> = {
    paid: 0,
    unpaid: 0,
    overdue: 0,
    partial: 0,
    pending_online: 0,
    draft: 0,
  };

  let outstandingCents = 0;
  let collectedCents = 0;

  for (const statement of statements) {
    const ps = getPaymentStatus(statement);
    counts[ps.key] += 1;
    collectedCents += statement.paidAmountCents;
    if (ps.key !== "paid" && ps.key !== "draft") {
      outstandingCents += getOutstandingCents(statement);
    }
  }

  return { outstandingCents, collectedCents, counts };
}
