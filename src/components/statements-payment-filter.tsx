"use client";

import { useRouter } from "next/navigation";
import { PAYMENT_FILTER_CHIP_LABELS, type PaymentStatusKey } from "@/lib/payment-status";

const PAYMENT_FILTERS: { key: PaymentStatusKey | "all"; label: string }[] = [
  { key: "all", label: "All statuses" },
  ...(
    ["draft", "unpaid", "overdue", "partial", "pending_online", "paid"] as PaymentStatusKey[]
  ).map((key) => ({ key, label: PAYMENT_FILTER_CHIP_LABELS[key] })),
];

type StatementsPaymentFilterProps = {
  activePayment?: string;
  activeUnitId?: string;
};

function statementsHref(payment?: string, unitId?: string) {
  const params = new URLSearchParams();
  if (unitId) params.set("unitId", unitId);
  if (payment && payment !== "all") params.set("payment", payment);
  const query = params.toString();
  return query ? `/billing/statements?${query}` : "/billing/statements";
}

export function StatementsPaymentFilter({ activePayment, activeUnitId }: StatementsPaymentFilterProps) {
  const router = useRouter();
  const active = activePayment || "all";

  return (
    <div className="flex items-center gap-2">
      <label className="shrink-0 text-sm font-medium text-muted">Status</label>
      <select
        value={active}
        onChange={(e) => router.push(statementsHref(e.target.value, activeUnitId))}
        className="h-9 min-w-0 flex-1 cursor-pointer rounded-xl border border-border bg-surface px-3 text-sm text-foreground shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:flex-none sm:w-44"
      >
        {PAYMENT_FILTERS.map((f) => (
          <option key={f.key} value={f.key}>{f.label}</option>
        ))}
      </select>
    </div>
  );
}
