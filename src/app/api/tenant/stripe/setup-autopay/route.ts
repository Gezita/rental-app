import { NextResponse } from "next/server";
import { cloudDataBlockedResponse } from "@/lib/cloud-guard";
import { isLocalDataOnlyDeploy } from "@/lib/deploy-config";
import { getSessionTenantId } from "@/lib/tenant-auth";
import { createTenantAutopaySetupSession } from "@/lib/tenant-stripe";
import { isStripeConfigured } from "@/lib/stripe";

export async function POST() {
  if (isLocalDataOnlyDeploy()) return cloudDataBlockedResponse();

  const tenantId = await getSessionTenantId();
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  try {
    const url = await createTenantAutopaySetupSession(tenantId);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start setup";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
