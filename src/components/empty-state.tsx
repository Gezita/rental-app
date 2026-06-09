import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui";

type EmptyStateProps = {
  title: string;
  description: string;
  primaryAction?: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
  className?: string;
};

export function EmptyState({
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface-muted/40 px-6 py-12 text-center",
        className
      )}
    >
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {primaryAction && (
            <ButtonLink href={primaryAction.href}>{primaryAction.label}</ButtonLink>
          )}
          {secondaryAction && (
            <ButtonLink href={secondaryAction.href} variant="outline">
              {secondaryAction.label}
            </ButtonLink>
          )}
        </div>
      )}
    </div>
  );
}
