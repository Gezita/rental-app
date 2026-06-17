import { LogOut } from "lucide-react";
import { signOutTenantAction } from "@/app/actions/tenant-auth";
import { BrandLogo } from "@/components/layout/brand-logo";
import { TenantNav } from "@/components/layout/tenant-nav";
import { SubmitButton } from "@/components/submit-button";
import { getTenantDisplayName, getTenantLandlordName, type TenantSessionContext } from "@/lib/tenant-auth";

export function TenantShell({
  tenant,
  children,
}: {
  tenant: TenantSessionContext;
  children: React.ReactNode;
}) {
  const landlordName = getTenantLandlordName(tenant);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="space-y-1">
            <BrandLogo href="/tenant" size="sm" variant="full" />
            <p className="text-sm text-muted">
              {getTenantDisplayName(tenant)} · {tenant.unit.property.name} — {tenant.unit.name}
            </p>
            <p className="text-xs text-muted">Managed by {landlordName}</p>
          </div>
          <form action={signOutTenantAction}>
            <SubmitButton variant="outline" size="sm" pendingLabel="Signing out…">
              <span className="inline-flex items-center gap-2">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </span>
            </SubmitButton>
          </form>
        </div>
        <TenantNav />
      </header>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
