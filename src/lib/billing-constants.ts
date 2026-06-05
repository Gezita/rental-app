import type { UtilityType } from "@prisma/client";

export const UTILITY_TYPE_LABELS: Record<UtilityType, string> = {
  gas: "Gas",
  water: "Water",
  electricity: "Electricity",
  internet: "Internet",
  other: "Other",
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const SPREADSHEET_UTILITY_OPTIONS = [
  { value: "gas", label: "Gas" },
  { value: "water", label: "Water" },
  { value: "electricity", label: "Electricity" },
] as const;

export function yearOptions(around = new Date().getFullYear()) {
  return [around - 2, around - 1, around, around + 1];
}
