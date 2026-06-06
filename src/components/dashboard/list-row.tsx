import { cn } from "@/lib/utils";

export function ListRow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm shadow-[var(--shadow-sm)] transition-colors hover:border-primary/15 hover:bg-primary-muted/20",
        className
      )}
    >
      {children}
    </li>
  );
}
