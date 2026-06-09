import { z } from "zod";
import type { UtilityType } from "@prisma/client";
import { parseMoneyToCents } from "./money";

// ── Zod Primitives ──────────────────────────────────────────────────────────

/** Non-empty trimmed string. */
export const zRequiredString = z.string().trim().min(1, "Required");

/** Optional string — empty string becomes undefined. */
export const zOptionalString = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : undefined),
  z.string().optional()
);

/** Required email, lowercased. */
export const zEmail = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email address")
  .transform((v) => v.toLowerCase());

/** Optional email — empty string becomes undefined. */
export const zOptionalEmail = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : undefined),
  z.string().email("Invalid email address").optional()
);

/** HTML checkbox: "on" → true, absent/anything else → false. */
export const zCheckbox = z.any().transform((v): boolean => v === "on");

/** Dollar string → non-negative integer cents. Returns 0 for blank. */
export const zCents = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || "0" : "0"),
  z.string().transform((v, ctx) => {
    const cents = parseMoneyToCents(v);
    if (!Number.isFinite(cents) || cents < 0) {
      ctx.addIssue({ code: "custom", message: "Invalid amount" });
      return z.NEVER;
    }
    return cents;
  })
);

/** Optional dollar string → integer cents | undefined. Silently drops invalid values. */
export const zOptionalCents = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : undefined),
  z
    .string()
    .transform((v) => {
      const cents = parseMoneyToCents(v);
      return Number.isFinite(cents) && cents >= 0 ? cents : undefined;
    })
    .optional()
);

/** Required ISO date string → Date. */
export const zDate = z.string().trim().transform((v, ctx) => {
  if (!v) {
    ctx.addIssue({ code: "custom", message: "Date is required" });
    return z.NEVER;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    ctx.addIssue({ code: "custom", message: "Invalid date" });
    return z.NEVER;
  }
  return d;
});

/** Optional ISO date string → Date | undefined. */
export const zOptionalDate = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : undefined),
  z
    .string()
    .transform((v, ctx) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: "custom", message: "Invalid date" });
        return z.NEVER;
      }
      return d;
    })
    .optional()
);

export const UTILITY_TYPES = ["gas", "water", "electricity", "internet", "other"] as const;

/** Validated utility type enum. */
export const zUtilityType = z.enum(UTILITY_TYPES);

/** Rent due day 1–31, clamped (never errors). */
export const zRentDueDay = z.preprocess(
  (v) => {
    const n = parseInt(String(v ?? 1), 10);
    return Number.isFinite(n) ? Math.min(31, Math.max(1, n)) : 1;
  },
  z.number().int()
);

/** Percentage 0–100, clamped (never errors). */
export const zPercentage = z.preprocess(
  (v) => {
    const n = parseFloat(String(v ?? 0));
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
  },
  z.number()
);

/** Calendar month 1–12. Falls back to 1 on invalid input. */
export const zMonth = z.preprocess(
  (v) => {
    const n = parseInt(String(v ?? 1), 10);
    return Number.isFinite(n) && n >= 1 && n <= 12 ? n : 1;
  },
  z.number().int().min(1).max(12)
);

/** Calendar year ≥ 2000. Falls back to current year on invalid input. */
export const zYear = z.preprocess(
  (v) => {
    const n = parseInt(String(v ?? new Date().getFullYear()), 10);
    return Number.isFinite(n) && n >= 2000 ? n : new Date().getFullYear();
  },
  z.number().int().min(2000)
);

export const PAYMENT_METHODS = [
  "e_transfer",
  "cash",
  "cheque",
  "bank_deposit",
  "stripe",
  "other",
] as const;

/** Payment method enum with e_transfer default. */
export const zPaymentMethod = z.preprocess(
  (v) => (typeof v === "string" && v ? v : "e_transfer"),
  z.enum(PAYMENT_METHODS)
);

// ── Legacy helpers (preserved for backward compatibility) ────────────────────

export function parseUtilityType(value: string): UtilityType | null {
  return UTILITY_TYPES.includes(value as UtilityType) ? (value as UtilityType) : null;
}

export function parseRentDueDay(value: string | number, fallback = 1): number {
  const parsed = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(31, Math.max(1, parsed));
}

export function parseValidDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parsePercentage(value: string | number): number {
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

export function rentDueDate(year: number, month: number, rentDueDay: number): Date {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(rentDueDay, lastDay);
  return new Date(year, month - 1, day);
}

export const MAX_XLSX_UPLOAD_BYTES = 10 * 1024 * 1024;
