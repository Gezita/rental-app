"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogOut, Menu, X } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { mobileNavSections, isNavItemActive } from "@/lib/navigation";
import { BrandLogo } from "./brand-logo";
import { navIconsByHref } from "./nav-icons";

type AppHeaderProps = {
  userName?: string | null;
  userEmail: string;
};

function isNavActive(pathname: string, href: string, exact?: boolean) {
  return isNavItemActive(pathname, href, exact);
}

export function AppHeader({ userName, userEmail }: AppHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur-md lg:hidden sm:px-6">
      <BrandLogo size="sm" variant="icon" />

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground shadow-[var(--shadow-sm)] transition-colors hover:bg-surface-muted hover:text-foreground"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-lg)]">
            <div className="border-b border-border-subtle bg-surface-muted/50 px-4 py-3">
              <p className="truncate text-sm font-medium text-foreground">
                {userName || "Landlord"}
              </p>
              <p className="truncate text-xs text-muted">{userEmail}</p>
            </div>

            <div className="py-2">
              {mobileNavSections.map((section) => (
                <div key={section.label}>
                  <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                    {section.label}
                  </p>
                  {section.items.map((item) => {
                    const Icon = navIconsByHref[item.href];
                    const active = isNavActive(pathname, item.href, item.exact);
                    const isChild = ["/tenants", "/utility-bills", "/inspections"].includes(
                      item.href
                    );
                    return (
                      <Link
                        key={`${section.label}-${item.href}-${item.label}`}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 py-2.5 text-sm transition-colors",
                          isChild ? "pl-8 pr-4" : "px-4",
                          active
                            ? "bg-primary-muted/60 font-medium text-primary-hover"
                            : "text-foreground hover:bg-surface-muted"
                        )}
                      >
                        {Icon ? <Icon className="h-4 w-4 text-muted" /> : null}
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="border-t border-border-subtle p-2">
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-surface-muted"
                >
                  <LogOut className="h-4 w-4 text-muted" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
