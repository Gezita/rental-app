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
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <Home className="h-4 w-4" />
        Home
      </Link>

      {parent && (
        <>
          <span className="text-slate-300">/</span>
          <Link
            href={parent.href}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {parent.label}
          </Link>
        </>
      )}
    </nav>
  );
}
