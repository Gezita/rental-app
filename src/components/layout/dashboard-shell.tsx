import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { dashboardNavItems } from "@/lib/navigation";
import { LogOut, Zap } from "lucide-react";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import { AppHeader } from "./app-header";
import { NavLink } from "./nav-link";

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
          <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-muted">
                <Zap className="h-5 w-5 text-primary" />
              </span>
              <span className="font-semibold tracking-tight text-foreground">Rentals</span>
            </Link>
          </div>
          <nav className="flex-1 space-y-0.5 p-3">
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
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
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
