import { prisma } from "@/lib/db";
import { getOutstandingCents } from "@/lib/payment-status";
import { recordStatementPayment } from "@/lib/record-payment";
import { getAppUrl, getStripe, isStripeConfigured } from "@/lib/stripe";
import { MONTH_NAMES } from "@/lib/billing-constants";

export async function ensureTenantStripeCustomer(tenant: {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  stripeCustomerId: string | null;
}) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured");
  }

  if (tenant.stripeCustomerId) {
    return tenant.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: tenant.email ?? undefined,
    name: `${tenant.firstName} ${tenant.lastName}`.trim(),
    metadata: { tenantId: tenant.id },
  });

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function createTenantAutopaySetupSession(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant not found");

  const customerId = await ensureTenantStripeCustomer(tenant);
  const stripe = getStripe();
  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    success_url: `${appUrl}/tenant/payments?autopay=success`,
    cancel_url: `${appUrl}/tenant/payments?autopay=cancelled`,
    metadata: {
      tenantId: tenant.id,
      purpose: "autopay_setup",
    },
  });

  if (!session.url) {
    throw new Error("Could not create Stripe setup session");
  }

  return session.url;
}

export async function saveTenantPaymentMethod(
  tenantId: string,
  paymentMethodId: string,
  enableAutoPay = true
) {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      stripePaymentMethodId: paymentMethodId,
      autoPayEnabled: enableAutoPay,
    },
  });
}

export async function setTenantAutoPayEnabled(tenantId: string, enabled: boolean) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant not found");
  if (enabled && !tenant.stripePaymentMethodId) {
    throw new Error("Add a payment method before enabling auto-pay");
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { autoPayEnabled: enabled },
  });
}

export async function createTenantStatementCheckoutSession(
  tenantId: string,
  statementId: string
) {
  const statement = await prisma.statement.findFirst({
    where: {
      id: statementId,
      tenantId,
      status: { in: ["sent", "partial", "overdue"] },
    },
    include: {
      tenant: true,
      unit: { include: { property: { include: { user: { include: { settings: true } } } } } },
    },
  });

  if (!statement) throw new Error("Statement not found");
  if (statement.status === "paid") throw new Error("Statement is already paid");

  const settings = statement.unit.property.user.settings;
  if (!settings?.stripePaymentsEnabled || !isStripeConfigured()) {
    throw new Error("Online payments are not enabled");
  }

  const outstanding = getOutstandingCents(statement);
  if (outstanding <= 0) throw new Error("Nothing due on this statement");

  const payToken = statement.payToken;
  if (!payToken) throw new Error("This statement is not ready for online payment");

  const stripe = getStripe();
  const appUrl = getAppUrl();
  const monthLabel = `${MONTH_NAMES[statement.statementMonth - 1]} ${statement.statementYear}`;
  const customerId = await ensureTenantStripeCustomer(statement.tenant);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
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
      tenantId,
    },
    success_url: `${appUrl}/tenant/statements/${statement.id}?success=1`,
    cancel_url: `${appUrl}/tenant/statements/${statement.id}?cancelled=1`,
  });

  await prisma.statement.update({
    where: { id: statement.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  if (!session.url) throw new Error("Could not create checkout session");
  return session.url;
}

export async function attemptAutoPayForStatement(statementId: string) {
  if (!isStripeConfigured()) return { charged: false, reason: "stripe_not_configured" };

  const statement = await prisma.statement.findUnique({
    where: { id: statementId },
    include: {
      tenant: true,
      unit: { include: { property: { include: { user: { include: { settings: true } } } } } },
    },
  });

  if (!statement) return { charged: false, reason: "not_found" };
  if (!statement.tenant.autoPayEnabled || !statement.tenant.stripePaymentMethodId) {
    return { charged: false, reason: "autopay_not_enabled" };
  }

  const settings = statement.unit.property.user.settings;
  if (!settings?.stripePaymentsEnabled) {
    return { charged: false, reason: "payments_disabled" };
  }

  const outstanding = getOutstandingCents(statement);
  if (outstanding <= 0 || statement.status === "paid") {
    return { charged: false, reason: "nothing_due" };
  }

  const customerId = statement.tenant.stripeCustomerId;
  if (!customerId) return { charged: false, reason: "no_customer" };

  const stripe = getStripe();

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: outstanding,
      currency: "cad",
      customer: customerId,
      payment_method: statement.tenant.stripePaymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        statementId: statement.id,
        tenantId: statement.tenantId,
        autoPay: "true",
      },
    });

    if (paymentIntent.status !== "succeeded") {
      return { charged: false, reason: "payment_not_succeeded" };
    }

    const existingPayment = await prisma.payment.findFirst({
      where: { statementId: statement.id, referenceNumber: paymentIntent.id },
    });
    if (existingPayment) return { charged: true, reason: "already_recorded" };

    await recordStatementPayment({
      statementId: statement.id,
      userId: statement.unit.property.userId,
      amountCents: paymentIntent.amount_received || outstanding,
      paymentDate: new Date(),
      paymentMethod: "stripe",
      referenceNumber: paymentIntent.id,
      sendReceiptEmail: true,
    });

    await prisma.statement.update({
      where: { id: statement.id },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    return { charged: true, reason: "success" };
  } catch (error) {
    console.error("[autopay] charge failed:", error);
    return { charged: false, reason: "charge_failed" };
  }
}
