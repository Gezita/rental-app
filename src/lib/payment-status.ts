import type { StatementStatus } from "@prisma/client";

export type PaymentStatusKey =
  | "draft"
  | "unpaid"
  | "partial"
  | "pending_online"
  | "paid"
  | "overdue";

export type PaymentStatusInfo = {
  key: PaymentStatusKey;
  label: string;
  variant: "default" | "success" | "warning" | "danger" | "secondary";
};

export function getPaymentStatus(statement: {
  status: StatementStatus;
  totalDueCents: number;
  paidAmountCents: number;
  stripeCheckoutSessionId?: string | null;
}): PaymentStatusInfo {
  if (statement.status === "draft" || statement.status === "cancelled") {
    return { key: "draft", label: "Draft", variant: "default" };
  }

  if (statement.status === "paid" || statement.paidAmountCents >= statement.totalDueCents) {
    return { key: "paid", label: "Paid", variant: "success" };
  }

  if (statement.status === "partial" || (statement.paidAmountCents > 0 && statement.paidAmountCents < statement.totalDueCents)) {
    return { key: "partial", label: "Partially paid", variant: "warning" };
  }

  if (statement.stripeCheckoutSessionId && statement.paidAmountCents === 0) {
    return { key: "pending_online", label: "Payment pending", variant: "warning" };
  }

  if (statement.status === "overdue") {
    return { key: "overdue", label: "Overdue", variant: "danger" };
  }

  return { key: "unpaid", label: "Unpaid", variant: "secondary" };
}

export function getOutstandingCents(statement: {
  totalDueCents: number;
  paidAmountCents: number;
}): number {
  return Math.max(0, statement.totalDueCents - statement.paidAmountCents);
}
