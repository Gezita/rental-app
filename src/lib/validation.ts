import type { UtilityType } from "@prisma/client";

const UTILITY_TYPES: UtilityType[] = ["gas", "water", "electricity", "internet", "other"];

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
