export function formatMoney(cents: number, currency = "CAD"): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function parseMoneyToCents(value: string | number): number {
  if (typeof value === "number") return Math.round(value * 100);
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}
