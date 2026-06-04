import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui";

type StatAccent = "primary" | "success" | "warning" | "danger" | "neutral";

const accentBar: Record<StatAccent, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-border",
};

const iconWrap: Record<StatAccent, string> = {
  primary: "bg-primary-muted text-primary",
  success: "bg-success-muted text-success",
  warning: "bg-warning-muted text-warning",
  danger: "bg-danger-muted text-danger",
  neutral: "bg-surface-muted text-muted-foreground",
};

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  accent?: StatAccent;
  valueClassName?: string;
  className?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "neutral",
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-shadow hover:shadow-[var(--shadow-md)]",
        className
      )}
    >
      <div className={cn("absolute left-0 top-0 h-full w-1", accentBar[accent])} />
      <div className="flex items-start justify-between gap-3 p-5 pl-6">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums tracking-tight text-foreground",
              valueClassName
            )}
          >
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              iconWrap[accent]
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>
    </Card>
  );
}
