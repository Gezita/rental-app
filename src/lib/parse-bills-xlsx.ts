import { isValid, parse } from "date-fns";
import * as XLSX from "xlsx";
import { isReasonableBillCents, parseMoneyToCents } from "@/lib/money";
import { statementMonthFromBillDate } from "@/lib/utility-bill-month";

export type ParsedBillRow = {
  month: number;
  year: number;
  amountCents: number;
};

type ParsedBillRowInternal = ParsedBillRow & { sortDate: Date };

const MONTH_NAMES: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const DATE_PARSE_FORMATS = [
  "yyyy-MM-dd",
  "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  "MM/dd/yyyy",
  "M/d/yyyy",
  "dd/MM/yyyy",
  "d/M/yyyy",
  "dd-MM-yyyy",
  "MMM d, yyyy",
  "MMMM d, yyyy",
  "MMM d yyyy",
  "MMMM d yyyy",
  "MMM yyyy",
  "MMMM yyyy",
];

const EXCLUDED_DATE_HEADERS = ["move in", "move out", "process"];

function excelSerialToDate(serial: number): Date {
  // Excel 1900 date system (common for .xls / .xlsx exports)
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000);
}

function isExcelSerialDate(n: number): boolean {
  return n >= 30_000 && n <= 80_000;
}

export function parseBillDateValue(raw: unknown): { month: number; year: number } | null {
  if (raw == null || raw === "") return null;

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const year = raw.getFullYear();
    if (year >= 2000 && year <= 2100) {
      return { month: raw.getMonth() + 1, year };
    }
    return null;
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (isExcelSerialDate(raw)) {
      const d = excelSerialToDate(raw);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    }
    return null;
  }

  const text = String(raw).trim();
  if (!text) return null;

  // Enbridge-style: "06/01/202612:00 AM" (date glued to time)
  const gluedUsDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (gluedUsDate) {
    const month = parseInt(gluedUsDate[1], 10);
    const day = parseInt(gluedUsDate[2], 10);
    let year = parseInt(gluedUsDate[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
      return { month, year };
    }
  }

  for (const fmt of DATE_PARSE_FORMATS) {
    const d = parse(text, fmt, new Date());
    if (isValid(d) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100) {
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    }
  }

  const slash = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slash) {
    const a = parseInt(slash[1], 10);
    const b = parseInt(slash[2], 10);
    let y = parseInt(slash[3], 10);
    if (y < 100) y += 2000;
    let month: number;
    let day: number;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      month = a;
      day = b;
    } else {
      // Ambiguous — prefer North American MM/DD (utility exports)
      month = a;
      day = b;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && y >= 2000 && y <= 2100) {
      return { month, year: y };
    }
  }

  const fallback = new Date(text);
  if (!Number.isNaN(fallback.getTime())) {
    const year = fallback.getFullYear();
    if (year >= 2000 && year <= 2100) {
      return { month: fallback.getMonth() + 1, year };
    }
  }

  return null;
}

/** Full calendar date for comparing multiple charges in the same month. */
export function parseFullBillDate(raw: unknown): Date | null {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;

  if (typeof raw === "number" && Number.isFinite(raw) && isExcelSerialDate(raw)) {
    return excelSerialToDate(raw);
  }

  const text = String(raw).trim();
  if (!text) return null;

  const gluedUsDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (gluedUsDate) {
    const month = parseInt(gluedUsDate[1], 10);
    const day = parseInt(gluedUsDate[2], 10);
    let year = parseInt(gluedUsDate[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day);
    }
  }

  for (const fmt of DATE_PARSE_FORMATS) {
    const d = parse(text, fmt, new Date());
    if (isValid(d) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100) return d;
  }

  const parts = parseBillDateValue(raw);
  return parts ? new Date(parts.year, parts.month - 1, 1) : null;
}

function billDateFromRow(row: unknown[], cols: ColumnMap, useBillDate: boolean): Date | null {
  if (useBillDate) return parseFullBillDate(row[cols.billDate]);

  if (cols.month >= 0) {
    const d = parseFullBillDate(row[cols.month]);
    if (d) return d;
  }
  if (cols.year >= 0) {
    const d = parseFullBillDate(row[cols.year]);
    if (d) return d;
  }

  for (const cell of row) {
    if (cell === row[cols.amount]) continue;
    const d = parseFullBillDate(cell);
    if (d) return d;
  }

  return null;
}

function parseMonthValue(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && raw >= 1 && raw <= 12) return Math.floor(raw);
  const s = String(raw).trim().toLowerCase();
  if (MONTH_NAMES[s]) return MONTH_NAMES[s];
  const n = parseInt(s, 10);
  if (n >= 1 && n <= 12) return n;
  const fromDate = parseBillDateValue(raw);
  return fromDate?.month ?? null;
}

function parseYearValue(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = Math.floor(raw);
    if (n >= 2000 && n <= 2100) return n;
    if (n >= 0 && n < 100) return 2000 + n;
    return null;
  }
  const s = String(raw).trim();
  const n = parseInt(s, 10);
  if (n >= 2000 && n <= 2100) return n;
  if (n >= 0 && n < 100) return 2000 + n;
  const fromDate = parseBillDateValue(raw);
  return fromDate?.year ?? null;
}

function parseAmountCents(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (isExcelSerialDate(raw)) return null;
    const cents = Math.round(raw * 100);
    return isReasonableBillCents(cents) ? cents : null;
  }
  const text = String(raw).trim();
  if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(text)) return null;
  try {
    const cents = parseMoneyToCents(text);
    return isReasonableBillCents(cents) ? cents : null;
  } catch {
    return null;
  }
}

function normalizeHeader(cell: unknown): string {
  return String(cell ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, " ");
}

type ColumnMap = {
  month: number;
  year: number;
  amount: number;
  billDate: number;
  rowType: number;
};

function isExcludedDateHeader(h: string): boolean {
  return EXCLUDED_DATE_HEADERS.some((k) => h.includes(k));
}

function scoreHeader(h: string, keys: string[], exactBonus = 2): number {
  let best = 0;
  for (const k of keys) {
    if (h === k) best = Math.max(best, exactBonus + k.length);
    else if (h.includes(k)) best = Math.max(best, k.length);
  }
  return best;
}

function findColumnIndexes(headerRow: unknown[], preferBillDateFormat: boolean): ColumnMap | null {
  const monthKeys = ["month", "bill month", "period month", "statement month"];
  const yearKeys = ["year", "bill year", "period year", "statement year"];
  const billDateKeys = [
    "bill date",
    "billing date",
    "statement date",
    "invoice date",
    "due date",
  ];
  const amountKeys = [
    "bill amount",
    "payment amount",
    "amount due",
    "total amount",
    "amount",
    "charge",
    "cost",
    "balance",
    "total",
  ];
  const rowTypeKeys = [
    "payment / adjustment / billing",
    "activity",
    "type",
    "details",
  ];

  let month = -1;
  let year = -1;
  let amount = -1;
  let billDate = -1;
  let rowType = -1;
  let monthScore = 0;
  let yearScore = 0;
  let amountScore = 0;
  let billDateScore = 0;
  let rowTypeScore = 0;

  headerRow.forEach((cell, i) => {
    const h = normalizeHeader(cell);
    if (!h) return;

    const m = scoreHeader(h, monthKeys);
    if (m > monthScore) {
      month = i;
      monthScore = m;
    }

    const y = scoreHeader(h, yearKeys);
    if (y > yearScore) {
      year = i;
      yearScore = y;
    }

    if (!isExcludedDateHeader(h)) {
      const d = scoreHeader(h, billDateKeys);
      if (d > billDateScore) {
        billDate = i;
        billDateScore = d;
      } else if (h === "date" && 4 + 2 > billDateScore) {
        billDate = i;
        billDateScore = 6;
      }
    }

    if (!h.includes("date") || h === "payment amount") {
      const a = scoreHeader(h, amountKeys);
      if (a > amountScore) {
        amount = i;
        amountScore = a;
      }
    }

    const t = scoreHeader(h, rowTypeKeys);
    if (t > rowTypeScore) {
      rowType = i;
      rowTypeScore = t;
    }
  });

  if (amount < 0) return null;

  if (preferBillDateFormat && billDate >= 0) {
    return { month: -1, year: -1, amount, billDate, rowType };
  }

  if (billDate >= 0 && month < 0 && year < 0) {
    return { month: -1, year: -1, amount, billDate, rowType };
  }

  return { month, year, amount, billDate: -1, rowType };
}

function isBillRow(row: unknown[], cols: ColumnMap): boolean {
  if (cols.rowType < 0) return true;
  const raw = row[cols.rowType];
  if (raw == null || raw === "") return false;
  const label = normalizeHeader(raw);
  if (!label) return false;
  if (label.includes("total") || label.includes("average") || label.includes("number of")) {
    return false;
  }
  return label === "bill" || label === "bills" || label.includes("bill");
}

/** Extract month/year from a cell — full dates win over month-only values. */
function parseMonthYearFromCell(raw: unknown): { month: number; year?: number } | null {
  const fromDate = parseBillDateValue(raw);
  if (fromDate) return fromDate;

  const month = parseMonthValue(raw);
  if (month == null) return null;

  return { month };
}

function resolveMonthYear(
  row: unknown[],
  cols: ColumnMap,
  useBillDate: boolean
): { month: number; year: number } | null {
  if (useBillDate) {
    const fromDate = parseBillDateValue(row[cols.billDate]);
    return fromDate;
  }

  let month: number | null = null;
  let year: number | null = null;

  if (cols.month >= 0) {
    const fromMonthCell = parseMonthYearFromCell(row[cols.month]);
    if (fromMonthCell) {
      month = fromMonthCell.month;
      if (fromMonthCell.year != null) year = fromMonthCell.year;
    }
  }

  if (year == null && cols.year >= 0) {
    year = parseYearValue(row[cols.year]);
  }

  if (month == null || year == null) {
    for (const cell of row) {
      if (cell === row[cols.amount]) continue;
      const fromDate = parseBillDateValue(cell);
      if (fromDate) {
        if (month == null) month = fromDate.month;
        if (year == null) year = fromDate.year;
        if (month != null && year != null) break;
      }
    }
  }

  if (month == null) return null;
  if (year == null) return null;

  return { month, year };
}

function parseSheetRows(
  rows: unknown[][],
  preferBillDateFormat: boolean
): ParsedBillRowInternal[] {
  if (rows.length === 0) return [];

  let headerIdx = 0;
  let cols = findColumnIndexes(rows[0] as unknown[], preferBillDateFormat);

  if (!cols && rows.length > 1) {
    for (let i = 1; i < Math.min(rows.length, 25); i++) {
      cols = findColumnIndexes(rows[i] as unknown[], preferBillDateFormat);
      if (cols) {
        headerIdx = i;
        break;
      }
    }
  }

  const parsed: ParsedBillRowInternal[] = [];

  if (cols) {
    const dataStart = headerIdx + 1;
    const useBillDate = cols.billDate >= 0;
    const monthOnlyFormat = !useBillDate && cols.month >= 0 && cols.year < 0;
    let lastYear: number | null = null;

    for (let r = dataStart; r < rows.length; r++) {
      const row = rows[r] as unknown[];
      if (!row?.length || row.every((c) => c == null || c === "")) continue;
      if (!isBillRow(row, cols)) continue;

      const amountCents = parseAmountCents(row[cols.amount]);
      if (!amountCents) continue;

      const fullDate = billDateFromRow(row, cols, useBillDate);
      let month: number;
      let year: number;
      let sortDate: Date;

      if (fullDate) {
        sortDate = fullDate;
        ({ month, year } = statementMonthFromBillDate(fullDate));
      } else {
        let resolved = resolveMonthYear(row, cols, useBillDate);

        // Month-name-only spreadsheets (no year column): carry year from the previous row.
        if (!resolved && monthOnlyFormat) {
          const partial = cols.month >= 0 ? parseMonthYearFromCell(row[cols.month]) : null;
          if (partial && lastYear != null) {
            resolved = { month: partial.month, year: lastYear };
          }
        }

        if (!resolved) continue;

        month = resolved.month;
        year = resolved.year;
        sortDate = new Date(year, month - 1, 1);
      }

      lastYear = year;
      parsed.push({
        month,
        year,
        amountCents,
        sortDate,
      });
    }

    if (parsed.length > 0) return parsed;
  }

  return parsed;
}

/** Label/value pairs like "Bill Date" in A1 and value in B1 (common electricity export). */
function parseLabelValuePairs(rows: unknown[][]): ParsedBillRowInternal[] {
  let billDate: { month: number; year: number } | null = null;
  let billDateRaw: unknown = null;
  let amountCents: number | null = null;

  for (const row of rows) {
    if (!row?.length) continue;
    const label = normalizeHeader(row[0]);
    const value = row[1];

    if (!label) continue;

    if (
      !billDate &&
      (label === "bill date" ||
        label.includes("bill date") ||
        label === "billing date" ||
        label.includes("billing date") ||
        label === "due date" ||
        label.includes("due date"))
    ) {
      billDate = parseBillDateValue(value);
      billDateRaw = value;
    }

    if (
      !amountCents &&
      (label === "bill amount" ||
        label.includes("bill amount") ||
        (label.includes("amount") && !label.includes("date")))
    ) {
      amountCents = parseAmountCents(value);
    }
  }

  if (billDate && amountCents) {
    const sortDate =
      parseFullBillDate(billDateRaw) ?? new Date(billDate.year, billDate.month - 1, 1);
    const { month, year } = statementMonthFromBillDate(sortDate);
    return [{ month, year, amountCents, sortDate }];
  }

  return [];
}

/** Scan all cells for a single dollar amount when the sheet has no table headers. */
function parseSingleAmount(rows: unknown[][]): number | null {
  for (const row of rows) {
    for (const cell of row as unknown[]) {
      const cents = parseAmountCents(cell);
      if (cents && cents >= 100) return cents;
    }
  }
  return null;
}

/** Scan for a single bill date when the sheet has no table headers. */
function parseSingleFullBillDate(rows: unknown[][]): Date | null {
  for (const row of rows) {
    for (const cell of row as unknown[]) {
      const d = parseFullBillDate(cell);
      if (d) return d;
    }
  }
  return null;
}

/**
 * One bill per statement month in the database. If multiple rows map to the same month,
 * keep the row with the latest bill date — not a sum.
 */
function consolidateRowsByMonth(rows: ParsedBillRowInternal[]): ParsedBillRow[] {
  const byKey = new Map<string, ParsedBillRowInternal>();
  for (const row of rows) {
    const key = `${row.year}-${row.month}`;
    const prev = byKey.get(key);
    if (!prev || row.sortDate.getTime() >= prev.sortDate.getTime()) {
      byKey.set(key, row);
    }
  }
  return [...byKey.values()]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map(({ month, year, amountCents }) => ({ month, year, amountCents }));
}

export function parseBillsFromXlsxBuffer(
  buffer: ArrayBuffer,
  options?: { defaultMonth?: number; defaultYear?: number; utilityType?: string }
): ParsedBillRow[] {
  const preferBillDateFormat = options?.utilityType === "electricity";

  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Spreadsheet has no sheets");

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];

  let parsed: ParsedBillRowInternal[] = [];

  const fromTable = parseSheetRows(rows, preferBillDateFormat);
  if (fromTable.length > 0) parsed = fromTable;
  else {
    const fromPairs = parseLabelValuePairs(rows);
    if (fromPairs.length > 0) parsed = fromPairs;
    else {
      const amountCents = parseSingleAmount(rows);
      const fullDate = parseSingleFullBillDate(rows);

      if (amountCents && fullDate) {
        const { month, year } = statementMonthFromBillDate(fullDate);
        parsed = [{ month, year, amountCents, sortDate: fullDate }];
      } else if (amountCents && options?.defaultMonth && options?.defaultYear) {
        parsed = [
          {
            month: options.defaultMonth,
            year: options.defaultYear,
            amountCents,
            sortDate: new Date(options.defaultYear, options.defaultMonth - 1, 1),
          },
        ];
      }
    }
  }

  if (parsed.length > 0) return consolidateRowsByMonth(parsed);

  const amountCents = parseSingleAmount(rows);
  if (amountCents) {
    throw new Error(
      "Found an amount in the file but no bill date. Add a Bill Date column, or select the bill month below before uploading."
    );
  }

  throw new Error(
    preferBillDateFormat
      ? "Could not read electricity bills. Use columns Bill Date and Bill Amount, or Month, Year, and Amount."
      : "Could not read bills from the spreadsheet. Use columns Month, Year, Amount — or Bill Date and Bill Amount."
  );
}
