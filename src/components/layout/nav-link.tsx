"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/navigation";
import { isNavGroupActive, isNavItemActive } from "@/lib/navigation";
import { navIconsByHref } from "./nav-icons";

type NavLinkProps = {
  href: string;
  label: string;
  exact?: boolean;
  nested?: boolean;
};

export function NavLink({ href, label, exact, nested }: NavLinkProps) {
  const pathname = usePathname();
  const active = isNavItemActive(pathname, href, exact);
  const Icon = href in navIconsByHref ? navIconsByHref[href] : undefined;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        nested && "py-2 pl-9 text-[13px] font-normal",
        active
          ? "bg-primary-muted text-primary-hover"
          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      )}
    >
      {active && !nested && (
        <span
          className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-primary"
          aria-hidden
        />
      )}
      {Icon && !nested ? (
        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted")} />
      ) : null}
      {label}
    </Link>
  );
}

type NavGroupProps = {
  item: NavItem;
};

export function NavGroup({ item }: NavGroupProps) {
  const pathname = usePathname();
  const groupActive = isNavGroupActive(pathname, item);
  const Icon = item.href in navIconsByHref ? navIconsByHref[item.href] : undefined;

  if (!item.children?.length) {
    return <NavLink href={item.href} label={item.label} exact={item.exact} />;
  }

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
          groupActive ? "text-primary-hover" : "text-muted-foreground"
        )}
      >
        {Icon ? (
          <Icon className={cn("h-4 w-4 shrink-0", groupActive ? "text-primary" : "text-muted")} />
        ) : null}
        <span className="flex-1">{item.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden />
      </div>
      <div className="space-y-0.5">
        {item.children.map((child) => (
          <NavLink
            key={child.href}
            href={child.href}
            label={child.label}
            exact={child.exact}
            nested
          />
        ))}
      </div>
    </div>
  );
}
