import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PaymentStatusKey } from "@/lib/payment-status";

const PAYMENT_FILTERS: { key: PaymentStatusKey | "all"; label: string }[] = [
  { key: "all", label: "All statuses" },
  { key: "draft", label: "Drafts" },
  { key: "unpaid", label: "Unpaid" },
  { key: "overdue", label: "Overdue" },
  { key: "partial", label: "Partial" },
  { key: "pending_online", label: "Pending online" },
  { key: "paid", label: "Paid" },
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
  return query ? `/statements?${query}` : "/statements";
}

export function StatementsPaymentFilter({
  activePayment,
  activeUnitId,
}: StatementsPaymentFilterProps) {
  const active = activePayment || "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-medium text-muted">Status:</span>
      {PAYMENT_FILTERS.map((filter) => {
        const isActive = active === filter.key;
        const href = statementsHref(filter.key === "all" ? undefined : filter.key, activeUnitId);

        return (
          <Link
            key={filter.key}
            href={href}
            className={cn(
              "inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary/30 bg-primary-muted text-primary-hover"
                : "border-border bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
