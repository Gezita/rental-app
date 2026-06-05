import Link from "next/link";
import { cn } from "@/lib/utils";

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
  return query ? `/statements?${query}` : "/statements";
}

export function StatementsUnitFilter({
  units,
  activeUnitId,
  activePayment,
  totalCount,
}: StatementsUnitFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-medium text-muted">Unit:</span>
      <Link
        href={statementsHref(undefined, activePayment)}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
          !activeUnitId
            ? "border-primary/30 bg-primary-muted text-primary-hover"
            : "border-border bg-surface text-muted-foreground hover:border-border hover:bg-surface-muted hover:text-foreground"
        )}
        aria-current={!activeUnitId ? "page" : undefined}
      >
        All units
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs tabular-nums",
            !activeUnitId ? "bg-primary/15 text-primary-hover" : "bg-surface-muted text-muted"
          )}
        >
          {totalCount}
        </span>
      </Link>
      {units.map((unit) => {
        const isActive = activeUnitId === unit.unitId;
        const href = statementsHref(unit.unitId, activePayment);

        return (
          <Link
            key={unit.unitId}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary/30 bg-primary-muted text-primary-hover"
                : "border-border bg-surface text-muted-foreground hover:border-border hover:bg-surface-muted hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {unit.label}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs tabular-nums",
                isActive ? "bg-primary/15 text-primary-hover" : "bg-surface-muted text-muted"
              )}
            >
              {unit.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
