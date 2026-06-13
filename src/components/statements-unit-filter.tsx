"use client";

import { useRouter } from "next/navigation";

export type StatementUnitFilterOption = {
  unitId: string;
  label: string;
  count: number;
};

type StatementsUnitFilterProps = {
  units: StatementUnitFilterOption[];
  activeUnitId?: string;
  activePayment?: string;
  totalCount: number;
};

function statementsHref(unitId?: string, payment?: string) {
  const params = new URLSearchParams();
  if (unitId) params.set("unitId", unitId);
  if (payment) params.set("payment", payment);
  const query = params.toString();
  return query ? `/billing/statements?${query}` : "/billing/statements";
}

export function StatementsUnitFilter({ units, activeUnitId, activePayment, totalCount }: StatementsUnitFilterProps) {
  const router = useRouter();
  const active = activeUnitId || "all";

  return (
    <div className="flex items-center gap-2">
      <label className="shrink-0 text-sm font-medium text-muted">Unit</label>
      <select
        value={active}
        onChange={(e) => {
          const val = e.target.value;
          router.push(statementsHref(val === "all" ? undefined : val, activePayment));
        }}
        className="h-9 min-w-0 flex-1 cursor-pointer rounded-xl border border-border bg-surface px-3 text-sm text-foreground shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:flex-none sm:w-56"
      >
        <option value="all">All units ({totalCount})</option>
        {units.map((unit) => (
          <option key={unit.unitId} value={unit.unitId}>
            {unit.label} ({unit.count})
          </option>
        ))}
      </select>
    </div>
  );
}
