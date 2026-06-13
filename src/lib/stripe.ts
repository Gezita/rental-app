import Stripe from "stripe";
import { getAppUrl } from "@/lib/app-url";

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Whether Stripe env vars are present (settings UI). Alias of isStripeConfigured. */
export const isStripeIntegrationConfigured = isStripeConfigured;

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
