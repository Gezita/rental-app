import { Badge } from "@/components/ui";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "secondary";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  draft: "secondary",
  ready: "secondary",
  sent: "default",
  viewed: "default",
  partial: "warning",
  paid: "success",
  overdue: "danger",
  cancelled: "default",
  open: "warning",
  in_progress: "secondary",
  completed: "success",
  planned: "warning",
  uploaded: "success",
  missing: "danger",
  duplicate: "warning",
  active: "success",
  ending_soon: "warning",
  expired: "default",
};

type StatusBadgeProps = {
  status: string;
  label?: string;
  className?: string;
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  const variant = STATUS_VARIANTS[normalized] ?? "default";
  const display =
    label ??
    status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <Badge variant={variant} className={className}>
      {display}
    </Badge>
  );
}
