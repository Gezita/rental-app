"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type PageTab = {
  href: string;
  label: string;
  exact?: boolean;
};

type PageTabsProps = {
  tabs: PageTab[];
  className?: string;
};

function isTabActive(pathname: string, href: string, exact?: boolean) {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function PageTabs({ tabs, className }: PageTabsProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Section tabs"
      className={cn(
        "flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface-muted/60 p-1",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = isTabActive(pathname, tab.href, tab.exact);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-surface text-foreground shadow-[var(--shadow-sm)]"
                : "text-muted-foreground hover:bg-surface/60 hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
