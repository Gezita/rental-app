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

/** Labels used in badges, dashboard breakdown, and filters. */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatusKey, string> = {
  draft: "Draft",
  unpaid: "Unpaid",
  overdue: "Overdue",
  partial: "Partially paid",
  pending_online: "Payment pending",
  paid: "Paid",
};

/** Plural chip labels for filter UI where brevity helps. */
export const PAYMENT_FILTER_CHIP_LABELS: Record<PaymentStatusKey, string> = {
  draft: "Drafts",
  unpaid: "Unpaid",
  overdue: "Overdue",
  partial: "Partially paid",
  pending_online: "Payment pending",
  paid: "Paid",
};

export const PAYMENT_BREAKDOWN_ORDER: PaymentStatusKey[] = [
  "paid",
  "unpaid",
  "overdue",
  "partial",
  "pending_online",
  "draft",
];

export const PAYMENT_STATUS_ACCENTS: Record<PaymentStatusKey, string> = {
  paid: "text-success",
  unpaid: "text-foreground",
  overdue: "text-danger",
  partial: "text-warning",
  pending_online: "text-warning",
  draft: "text-muted",
};

export function getPaymentStatus(statement: {
  status: StatementStatus;
  totalDueCents: number;
  paidAmountCents: number;
  stripeCheckoutSessionId?: string | null;
}): PaymentStatusInfo {
  if (statement.status === "draft" || statement.status === "cancelled") {
    return { key: "draft", label: PAYMENT_STATUS_LABELS.draft, variant: "default" };
  }

  if (statement.status === "paid" || statement.paidAmountCents >= statement.totalDueCents) {
    return { key: "paid", label: PAYMENT_STATUS_LABELS.paid, variant: "success" };
  }

  if (statement.status === "partial" || (statement.paidAmountCents > 0 && statement.paidAmountCents < statement.totalDueCents)) {
    return { key: "partial", label: PAYMENT_STATUS_LABELS.partial, variant: "warning" };
  }

  if (statement.stripeCheckoutSessionId && statement.paidAmountCents === 0) {
    return { key: "pending_online", label: PAYMENT_STATUS_LABELS.pending_online, variant: "warning" };
  }

  if (statement.status === "overdue") {
    return { key: "overdue", label: PAYMENT_STATUS_LABELS.overdue, variant: "danger" };
  }

  return { key: "unpaid", label: PAYMENT_STATUS_LABELS.unpaid, variant: "secondary" };
}

export function getOutstandingCents(statement: {
  totalDueCents: number;
  paidAmountCents: number;
}): number {
  return Math.max(0, statement.totalDueCents - statement.paidAmountCents);
}

/** Balance still owed; zero for paid or cancelled statements. */
export function getStatementOutstandingCents(statement: {
  totalDueCents: number;
  paidAmountCents: number;
  status: string;
}): number {
  if (statement.status === "paid" || statement.status === "cancelled") return 0;
  return getOutstandingCents(statement);
}
