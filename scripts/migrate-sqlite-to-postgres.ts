/**
 * One-shot migration: copies all data from the legacy SQLite database
 * (prisma/dev.db) into the PostgreSQL database pointed to by DATABASE_URL.
 *
 * Usage: npm run db:import-sqlite
 * (or: DATABASE_URL="<neon-connection-string>" npx tsx scripts/migrate-sqlite-to-postgres.ts)
 *
 * WARNING: this wipes all existing rows in Postgres before copying.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const SQLITE_PATH = path.join(process.cwd(), "prisma", "dev.db");

// Insert order satisfies foreign-key dependencies; deletes run in reverse.
const TABLES = [
  "User",
  "UserSettings",
  "UtilityProfile",
  "Property",
  "Unit",
  "Tenant",
  "Document",
  "Lease",
  "UtilityRule",
  "UtilityBill",
  "UtilityBillSplit",
  "Statement",
  "StatementLineItem",
  "Payment",
  "Receipt",
  "LeaseDraft",
  "Inspection",
  "InspectionItem",
  "InspectionItemPhoto",
  "MaintenanceRecord",
] as const;

const prisma = new PrismaClient();

function sqliteQuery(sql: string): string {
  return execFileSync("sqlite3", ["-json", SQLITE_PATH, sql], {
    encoding: "utf8",
  });
}

function sqliteTableExists(table: string): boolean {
  const out = sqliteQuery(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}';`
  );
  return out.trim().length > 0;
}

/** Declared column types, e.g. { createdAt: "DATETIME", isActive: "BOOLEAN" } */
function sqliteColumnTypes(table: string): Record<string, string> {
  const raw = sqliteQuery(`PRAGMA table_info("${table}");`);
  const cols = JSON.parse(raw) as { name: string; type: string }[];
  return Object.fromEntries(cols.map((c) => [c.name, c.type.toUpperCase()]));
}

function readRows(table: string): Record<string, unknown>[] {
  const raw = sqliteQuery(`SELECT * FROM "${table}";`).trim();
  if (!raw) return [];
  const rows = JSON.parse(raw) as Record<string, unknown>[];
  const types = sqliteColumnTypes(table);

  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [col, value] of Object.entries(row)) {
      if (value === null || value === undefined) {
        out[col] = null;
        continue;
      }
      const type = types[col] ?? "";
      if (type.includes("DATETIME")) {
        // Prisma's SQLite connector stores DateTime as epoch milliseconds
        out[col] = typeof value === "number" ? new Date(value) : new Date(String(value));
      } else if (type.includes("BOOLEAN")) {
        out[col] = value === 1 || value === true;
      } else {
        out[col] = value;
      }
    }
    return out;
  });
}

function modelDelegate(table: string) {
  const key = table.charAt(0).toLowerCase() + table.slice(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any)[key] as {
    deleteMany: () => Promise<{ count: number }>;
    createMany: (args: { data: unknown[] }) => Promise<{ count: number }>;
    count: () => Promise<number>;
  };
}

async function main() {
  console.log(`Source:  ${SQLITE_PATH}`);
  console.log(`Target:  ${process.env.DATABASE_URL}\n`);

  console.log("Wiping existing Postgres data...");
  for (const table of [...TABLES].reverse()) {
    const { count } = await modelDelegate(table).deleteMany();
    if (count > 0) console.log(`  cleared ${table} (${count} rows)`);
  }

  console.log("\nCopying data from SQLite...");
  let total = 0;
  for (const table of TABLES) {
    if (!sqliteTableExists(table)) {
      console.log(`  ${table}: not in SQLite, skipped`);
      continue;
    }
    const rows = readRows(table);
    if (rows.length === 0) {
      console.log(`  ${table}: 0 rows`);
      continue;
    }
    const { count } = await modelDelegate(table).createMany({ data: rows });
    total += count;
    console.log(`  ${table}: ${count} rows`);
  }

  console.log("\nVerifying...");
  let mismatches = 0;
  for (const table of TABLES) {
    if (!sqliteTableExists(table)) continue;
    const sqliteCount = JSON.parse(
      sqliteQuery(`SELECT count(*) AS c FROM "${table}";`)
    )[0].c as number;
    const pgCount = await modelDelegate(table).count();
    if (sqliteCount !== pgCount) {
      mismatches++;
      console.error(`  MISMATCH ${table}: sqlite=${sqliteCount} postgres=${pgCount}`);
    }
  }

  if (mismatches > 0) {
    throw new Error(`${mismatches} table(s) did not match`);
  }
  console.log(`  all table counts match.\n\nDone — ${total} rows migrated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
