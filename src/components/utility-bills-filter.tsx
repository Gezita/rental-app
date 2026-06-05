import Link from "next/link";
import type { UtilityType } from "@prisma/client";
import { cn } from "@/lib/utils";

const FILTER_TYPES = [
  { value: "all", label: "All" },
  { value: "gas", label: "Gas" },
  { value: "water", label: "Water" },
  { value: "electricity", label: "Electricity" },
] as const;

type UtilityBillsFilterProps = {
  propertyId: string;
  activeType: string;
  counts: Record<string, number>;
};

export function UtilityBillsFilter({
  propertyId,
  activeType,
  counts,
}: UtilityBillsFilterProps) {
  const base = `/properties/${propertyId}/utility-bills`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-medium text-muted">Filter:</span>
      {FILTER_TYPES.map((option) => {
        const isActive = activeType === option.value;
        const count =
          option.value === "all"
            ? Object.values(counts).reduce((sum, n) => sum + n, 0)
            : counts[option.value] ?? 0;
        const href = option.value === "all" ? base : `${base}?type=${option.value}`;

        return (
          <Link
            key={option.value}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary/30 bg-primary-muted text-primary-hover"
                : "border-border bg-surface text-muted-foreground hover:border-border hover:bg-surface-muted hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {option.label}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs tabular-nums",
                isActive ? "bg-primary/15 text-primary-hover" : "bg-surface-muted text-muted"
              )}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function isUtilityFilterType(value: string | undefined): value is UtilityType {
  return value === "gas" || value === "water" || value === "electricity";
}
