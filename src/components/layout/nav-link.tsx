"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/navigation";
import { isNavGroupActive, isNavItemActive } from "@/lib/navigation";
import { navIconsByHref } from "./nav-icons";

function useNavGroupExpanded(item: NavItem) {
  const pathname = usePathname();
  const groupActive = isNavGroupActive(pathname, item);
  const [expanded, setExpanded] = useState(groupActive);

  useEffect(() => {
    if (groupActive) setExpanded(true);
  }, [groupActive]);

  return { expanded, toggle: () => setExpanded((prev) => !prev) };
}

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
  const { expanded, toggle } = useNavGroupExpanded(item);
  const Icon = item.href in navIconsByHref ? navIconsByHref[item.href] : undefined;

  if (!item.children?.length) {
    return <NavLink href={item.href} label={item.label} exact={item.exact} />;
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          groupActive ? "text-primary-hover" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        )}
      >
        {Icon ? (
          <Icon className={cn("h-4 w-4 shrink-0", groupActive ? "text-primary" : "text-muted")} />
        ) : null}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted transition-transform",
            expanded && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {expanded ? (
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
      ) : null}
    </div>
  );
}

type MobileNavGroupProps = {
  item: NavItem;
  onNavigate: () => void;
};

export function MobileNavGroup({ item, onNavigate }: MobileNavGroupProps) {
  const pathname = usePathname();
  const groupActive = isNavGroupActive(pathname, item);
  const { expanded, toggle } = useNavGroupExpanded(item);
  const Icon = item.href in navIconsByHref ? navIconsByHref[item.href] : undefined;

  if (!item.children?.length) {
    const active = isNavItemActive(pathname, item.href, item.exact);
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
          active
            ? "bg-primary-muted/60 font-medium text-primary-hover"
            : "text-foreground hover:bg-surface-muted"
        )}
      >
        {Icon ? <Icon className="h-4 w-4 text-muted" /> : null}
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
          groupActive
            ? "font-medium text-primary-hover"
            : "text-foreground hover:bg-surface-muted"
        )}
      >
        {Icon ? <Icon className="h-4 w-4 text-muted" /> : null}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted transition-transform",
            expanded && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div>
          {item.children.map((child) => {
            const ChildIcon = navIconsByHref[child.href];
            const active = isNavItemActive(pathname, child.href, child.exact);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 py-2.5 pl-8 pr-4 text-sm transition-colors",
                  active
                    ? "bg-primary-muted/60 font-medium text-primary-hover"
                    : "text-foreground hover:bg-surface-muted"
                )}
              >
                {ChildIcon ? <ChildIcon className="h-4 w-4 text-muted" /> : null}
                {child.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
