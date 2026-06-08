import { requireUser } from "@/lib/auth";
import { dashboardNavItems } from "@/lib/navigation";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import { AppHeader } from "./app-header";
import { BrandLogo } from "./brand-logo";
import { NavLink } from "./nav-link";

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/api/auth/clear-session");

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-border bg-surface shadow-[var(--shadow-sm)] lg:flex">
          <div className="flex h-16 items-center border-b border-border px-5">
            <BrandLogo variant="full" />
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {dashboardNavItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                exact={item.exact}
              />
            ))}
          </nav>
          <div className="border-t border-border p-4">
            <p className="mb-2 truncate text-xs text-muted">{user.email}</p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <main className="flex-1 lg:pl-64">
          <AppHeader userName={user.name} userEmail={user.email} />
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
