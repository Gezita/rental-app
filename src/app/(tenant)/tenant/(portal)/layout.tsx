import { redirect } from "next/navigation";
import { TenantShell } from "@/components/layout/tenant-shell";
import { getSessionTenantId, requireTenant } from "@/lib/tenant-auth";

export default async function TenantPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenantId = await getSessionTenantId();
  if (!tenantId) redirect("/tenant/sign-in");

  const tenant = await requireTenant();

  return <TenantShell tenant={tenant}>{children}</TenantShell>;
}
