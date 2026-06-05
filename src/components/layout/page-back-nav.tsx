import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";

type PageBackNavProps = {
  parent?: { href: string; label: string };
  className?: string;
};

export function PageBackNav({ parent, className }: PageBackNavProps) {
  return (
    <nav className={cn("flex flex-wrap items-center gap-2", className)}>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      >
        <Home className="h-4 w-4" />
        Home
      </Link>

      {parent && (
        <>
          <span className="text-border">/</span>
          <Link
            href={parent.href}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {parent.label}
          </Link>
        </>
      )}
    </nav>
  );
}
