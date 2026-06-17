import { NextResponse } from "next/server";
import { cloudDataBlockedResponse } from "@/lib/cloud-guard";
import { isLocalDataOnlyDeploy } from "@/lib/deploy-config";
import { prisma } from "@/lib/db";
import { getOutstandingCents } from "@/lib/payment-status";
import { getAppUrl, getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST(request: Request) {
  if (isLocalDataOnlyDeploy()) return cloudDataBlockedResponse();

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const payToken = String(body.payToken || "");
  const returnTo = body.returnTo === "tenant" ? "tenant" : "pay";

  if (!payToken) {
    return NextResponse.json({ error: "payToken is required" }, { status: 400 });
  }

  const statement = await prisma.statement.findFirst({
    where: { payToken },
    include: {
      tenant: true,
      unit: { include: { property: { include: { user: { include: { settings: true } } } } } },
    },
  });

  if (!statement) {
    return NextResponse.json({ error: "Statement not found" }, { status: 404 });
  }

  if (statement.status === "paid") {
    return NextResponse.json({ error: "Statement is already paid" }, { status: 400 });
  }

  const settings = statement.unit.property.user.settings;
  if (!settings?.stripePaymentsEnabled) {
    return NextResponse.json({ error: "Online payments are not enabled" }, { status: 403 });
  }

  const outstanding = getOutstandingCents(statement);
  if (outstanding <= 0) {
    return NextResponse.json({ error: "Nothing due on this statement" }, { status: 400 });
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();
  const monthLabel = `${statement.statementMonth}/${statement.statementYear}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "cad",
          unit_amount: outstanding,
          product_data: {
            name: `Rent statement ${statement.statementNumber}`,
            description: `${statement.unit.property.name} · ${statement.unit.name} · ${monthLabel}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      statementId: statement.id,
      payToken,
    },
    success_url:
      returnTo === "tenant"
        ? `${appUrl}/tenant/statements/${statement.id}?success=1`
        : `${appUrl}/pay/${payToken}?success=1`,
    cancel_url:
      returnTo === "tenant"
        ? `${appUrl}/tenant/statements/${statement.id}?cancelled=1`
        : `${appUrl}/pay/${payToken}?cancelled=1`,
  });

  await prisma.statement.update({
    where: { id: statement.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  return NextResponse.json({ url: session.url });
}
