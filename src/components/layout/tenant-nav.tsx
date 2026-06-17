"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, FileText, Home, Megaphone, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems: Array<{
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
}> = [
  { href: "/tenant", label: "Home", icon: Home, exact: true },
  { href: "/tenant/payments", label: "Payments", icon: CreditCard },
  { href: "/tenant/statements", label: "Statements", icon: FileText },
  { href: "/tenant/documents", label: "Documents", icon: FolderOpen },
  { href: "/tenant/notices", label: "Notices", icon: Megaphone },
];

export function TenantNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary-muted text-primary"
                : "text-muted hover:bg-surface-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
