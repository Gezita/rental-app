/** Upper bound for a single utility bill (~$50,000). Guards against date strings parsed as amounts. */
export const MAX_REASONABLE_BILL_CENTS = 5_000_000;

export function formatMoney(cents: number, currency = "CAD"): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function isReasonableBillCents(cents: number): boolean {
  return Number.isFinite(cents) && cents > 0 && cents <= MAX_REASONABLE_BILL_CENTS;
}

export function parseMoneyToCents(value: string | number): number {
  if (typeof value === "number") return Math.round(value * 100);
  const trimmed = value.trim();
  const cleaned = trimmed.replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed)) return 0;
  // Strings like "10/12/2026" strip to long digit runs — not a currency value.
  if (!trimmed.includes(".") && cleaned.replace(/-/g, "").length > 7) return 0;
  return Math.round(parsed * 100);
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}
