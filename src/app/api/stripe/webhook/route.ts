import { NextResponse } from "next/server";
import { cloudDataBlockedResponse } from "@/lib/cloud-guard";
import { isLocalDataOnlyDeploy } from "@/lib/deploy-config";
import { prisma } from "@/lib/db";
import { recordStatementPayment } from "@/lib/record-payment";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { saveTenantPaymentMethod } from "@/lib/tenant-stripe";
import type Stripe from "stripe";

export async function POST(request: Request) {
  if (isLocalDataOnlyDeploy()) return cloudDataBlockedResponse();

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.mode === "setup" && session.metadata?.purpose === "autopay_setup") {
      const tenantId = session.metadata.tenantId;
      if (tenantId && session.setup_intent) {
        const setupIntent = await stripe.setupIntents.retrieve(String(session.setup_intent));
        const paymentMethodId =
          typeof setupIntent.payment_method === "string"
            ? setupIntent.payment_method
            : setupIntent.payment_method?.id;
        if (paymentMethodId) {
          await saveTenantPaymentMethod(tenantId, paymentMethodId, true);
        }
      }
      return NextResponse.json({ received: true });
    }

    const statementId = session.metadata?.statementId;
    const payToken = session.metadata?.payToken;

    if (!statementId) {
      return NextResponse.json({ received: true });
    }

    const statement = await prisma.statement.findFirst({
      where: payToken ? { id: statementId, payToken } : { id: statementId },
      include: { unit: { include: { property: true } } },
    });

    if (!statement || statement.status === "paid") {
      return NextResponse.json({ received: true });
    }

    const paymentRef = session.payment_intent
      ? String(session.payment_intent)
      : session.id;
    const existingPayment = await prisma.payment.findFirst({
      where: { statementId: statement.id, referenceNumber: paymentRef },
    });
    if (existingPayment) {
      return NextResponse.json({ received: true });
    }

    const amountCents = session.amount_total ?? statement.totalDueCents - statement.paidAmountCents;

    await recordStatementPayment({
      statementId: statement.id,
      userId: statement.unit.property.userId,
      amountCents,
      paymentDate: new Date(),
      paymentMethod: "stripe",
      referenceNumber: paymentRef,
      sendReceiptEmail: true,
    });

    await prisma.statement.update({
      where: { id: statement.id },
      data: {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: session.payment_intent
          ? String(session.payment_intent)
          : null,
      },
    });
  }

  return NextResponse.json({ received: true });
}
