"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navIconsByHref } from "./nav-icons";

type NavLinkProps = {
  href: string;
  label: string;
  exact?: boolean;
};

export function NavLink({ href, label, exact }: NavLinkProps) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
  const Icon = navIconsByHref[href];

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary-muted text-primary-hover"
          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      )}
    >
      {Icon ? (
        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted")} />
      ) : null}
      {label}
    </Link>
  );
}
