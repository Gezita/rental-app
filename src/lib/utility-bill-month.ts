import type { Prisma } from "@prisma/client";

/** Bills that apply to a statement period (e.g. March 2024 statement → March 2024 bills). */
export function utilityBillsForStatementMonthWhere(
  propertyId: string,
  statementMonth: number,
  statementYear: number
): Prisma.UtilityBillWhereInput {
  return {
    propertyId,
    OR: [
      {
        billMonth: statementMonth,
        billYear: statementYear,
      },
      {
        billMonth: null,
        billYear: null,
        dueDate: {
          gte: new Date(statementYear, statementMonth - 1, 1),
          lt: new Date(statementYear, statementMonth, 1),
        },
      },
      {
        billMonth: null,
        billYear: null,
        dueDate: null,
        billingPeriodStart: { lte: new Date(statementYear, statementMonth, 0, 23, 59, 59) },
        billingPeriodEnd: { gte: new Date(statementYear, statementMonth - 1, 1) },
      },
    ],
  };
}

/**
 * Bill month for statements: uses the bill's calendar date, but charges dated on the
 * 30th or 31st count toward the following month (common utility billing cutoff).
 */
export function statementMonthFromBillDate(date: Date): { month: number; year: number } {
  let month = date.getMonth() + 1;
  let year = date.getFullYear();
  if (date.getDate() >= 30) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return { month, year };
}

export function billMonthYearFromDueDate(dueDate: Date) {
  const { month, year } = statementMonthFromBillDate(dueDate);
  return { billMonth: month, billYear: year };
}

export function defaultBillingDatesForMonth(month: number, year: number) {
  const billingPeriodStart = new Date(year, month - 1, 1);
  const billingPeriodEnd = new Date(year, month, 0, 23, 59, 59);
  const dueDate = new Date(year, month - 1, 15);
  return { billingPeriodStart, billingPeriodEnd, dueDate };
}
