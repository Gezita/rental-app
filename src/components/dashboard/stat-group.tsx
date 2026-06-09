import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { cn } from "@/lib/utils";

export type StatGroupItem = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  valueClassName?: string;
};

type StatGroupProps = {
  title?: string;
  description?: string;
  items: StatGroupItem[];
  columns?: 2 | 3 | 4;
  className?: string;
};

const columnClass: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
};

function StatCell({
  label,
  value,
  hint,
  href,
  valueClassName,
}: StatGroupItem) {
  const content = (
    <div
      className={cn(
        "rounded-xl border border-border-subtle bg-surface-muted/30 px-4 py-3 transition-colors",
        href && "hover:border-primary/20 hover:bg-primary-muted/20"
      )}
    >
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-foreground",
          valueClassName
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {content}
    </Link>
  );
}

export function StatGroup({
  title,
  description,
  items,
  columns = 4,
  className,
}: StatGroupProps) {
  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader className="pb-3">
          {title && <CardTitle className="text-base">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={cn(!title && !description && "pt-6")}>
        <div className={cn("grid gap-3", columnClass[columns])}>
          {items.map((item) => (
            <StatCell key={item.label} {...item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
