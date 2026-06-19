import Stripe from "stripe";
import { getAppUrl } from "@/lib/app-url";

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-05-27.dahlia",
    });
  }
  return stripeClient;
}

export { getAppUrl } from "@/lib/app-url";

// ── Stripe Connect (Express) ────────────────────────────────────────────────
// The STRIPE_SECRET_KEY above is the *platform* key. Each landlord gets their own
// connected account ("acct_…"); tenant payments route there, not to the platform.

export type ConnectAccountStatus = {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  bankLast4: string | null;
};

/** Creates a new Express connected account for a landlord. Returns the acct id. */
export async function createConnectAccount(params: {
  email: string;
  userId: string;
}): Promise<string> {
  const account = await getStripe().accounts.create({
    type: "express",
    email: params.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
      us_bank_account_ach_payments: { requested: true },
    },
    business_type: "individual",
    metadata: { userId: params.userId },
  });
  return account.id;
}

/** Hosted onboarding link the landlord is redirected to. Single-use, short-lived. */
export async function createAccountLink(params: {
  accountId: string;
  returnUrl: string;
  refreshUrl: string;
}): Promise<string> {
  const link = await getStripe().accountLinks.create({
    account: params.accountId,
    return_url: params.returnUrl,
    refresh_url: params.refreshUrl,
    type: "account_onboarding",
  });
  return link.url;
}

/** Express dashboard "Manage on Stripe" login link. */
export async function createLoginLink(accountId: string): Promise<string> {
  const link = await getStripe().accounts.createLoginLink(accountId);
  return link.url;
}

/** Current capability status of a connected account, used to mirror onto settings. */
export async function getAccountStatus(accountId: string): Promise<ConnectAccountStatus> {
  const account = await getStripe().accounts.retrieve(accountId);
  const bankAccount = account.external_accounts?.data.find(
    (ea): ea is Stripe.BankAccount => ea.object === "bank_account"
  );
  return {
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
    bankLast4: bankAccount?.last4 ?? null,
  };
}
