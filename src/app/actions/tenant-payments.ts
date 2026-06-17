"use server";

import { redirect } from "next/navigation";
import { assertCloudDataAllowed } from "@/lib/cloud-guard";
import { requireTenant } from "@/lib/tenant-auth";
import { setTenantAutoPayEnabled } from "@/lib/tenant-stripe";

export async function enableTenantAutoPayAction() {
  assertCloudDataAllowed();
  const tenant = await requireTenant();
  await setTenantAutoPayEnabled(tenant.id, true);
  redirect("/tenant/payments?autopay=enabled");
}

export async function disableTenantAutoPayAction() {
  assertCloudDataAllowed();
  const tenant = await requireTenant();
  await setTenantAutoPayEnabled(tenant.id, false);
  redirect("/tenant/payments?autopay=disabled");
}
