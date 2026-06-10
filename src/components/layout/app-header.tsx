"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { dashboardNavItems } from "@/lib/navigation";
import { BrandLogo } from "./brand-logo";
import { MobileNavGroup } from "./nav-link";

type AppHeaderProps = {
  userName?: string | null;
  userEmail: string;
};

export function AppHeader({ userName, userEmail }: AppHeaderProps) {
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
              <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                Navigate
              </p>
              {dashboardNavItems
                .filter((item) => item.href !== "/settings")
                .map((item) => (
                  <MobileNavGroup
                    key={item.href}
                    item={item}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                Account
              </p>
              {dashboardNavItems
                .filter((item) => item.href === "/settings")
                .map((item) => (
                  <MobileNavGroup
                    key={item.href}
                    item={item}
                    onNavigate={() => setOpen(false)}
                  />
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
