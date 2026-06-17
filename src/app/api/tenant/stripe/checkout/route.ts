import { NextResponse } from "next/server";
import { cloudDataBlockedResponse } from "@/lib/cloud-guard";
import { isLocalDataOnlyDeploy } from "@/lib/deploy-config";
import { getSessionTenantId } from "@/lib/tenant-auth";
import { getPrimaryPayableStatement } from "@/lib/tenant-payments";
import { createTenantStatementCheckoutSession } from "@/lib/tenant-stripe";
import { isStripeConfigured } from "@/lib/stripe";

export async function POST(request: Request) {
  if (isLocalDataOnlyDeploy()) return cloudDataBlockedResponse();

  const tenantId = await getSessionTenantId();
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  let statementId = String(body.statementId || "");

  if (!statementId) {
    const primary = await getPrimaryPayableStatement(tenantId);
    if (!primary) {
      return NextResponse.json({ error: "No balance due" }, { status: 400 });
    }
    statementId = primary.id;
  }

  try {
    const url = await createTenantStatementCheckoutSession(tenantId, statementId);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
