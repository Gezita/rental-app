import { NextRequest, NextResponse } from "next/server";
import { cloudDataBlockedResponse } from "@/lib/cloud-guard";
import { isLocalDataOnlyDeploy } from "@/lib/deploy-config";
import { setTenantSession } from "@/lib/tenant-auth";
import { consumeTenantMagicLink } from "@/lib/tenant-magic-link";

export async function GET(request: NextRequest) {
  if (isLocalDataOnlyDeploy()) {
    return cloudDataBlockedResponse();
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/tenant/sign-in?error=invalid", request.url));
  }

  const tenant = await consumeTenantMagicLink(token);
  if (!tenant) {
    return NextResponse.redirect(new URL("/tenant/sign-in?error=expired", request.url));
  }

  await setTenantSession(tenant.id);
  return NextResponse.redirect(new URL("/tenant", request.url));
}
