/**
 * Import legacy SQLite data (prisma/dev.db) into PostgreSQL.
 *
 * Usage:
 *   npm run db:import-sqlite
 *   npm run db:import-sqlite -- --dry-run
 *   npm run db:import-sqlite -- --replace
 *   SQLITE_PATH=./prisma/dev.db npm run db:import-sqlite
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";

const DEFAULT_SQLITE_PATH = path.join(process.cwd(), "prisma", "dev.db");

/** Insert order respects foreign keys. */
const TABLE_MODELS = [
  { table: "User", model: "user" },
  { table: "UserSettings", model: "userSettings" },
  { table: "Property", model: "property" },
  { table: "Unit", model: "unit" },
  { table: "Tenant", model: "tenant" },
  { table: "Document", model: "document" },
  { table: "Lease", model: "lease" },
  { table: "UtilityRule", model: "utilityRule" },
  { table: "UtilityBill", model: "utilityBill" },
  { table: "UtilityBillSplit", model: "utilityBillSplit" },
  { table: "Statement", model: "statement" },
  { table: "StatementLineItem", model: "statementLineItem" },
  { table: "Payment", model: "payment" },
  { table: "Receipt", model: "receipt" },
  { table: "MaintenanceRecord", model: "maintenanceRecord" },
] as const;

type TableModel = (typeof TABLE_MODELS)[number];
type ModelName = TableModel["model"];

const BOOLEAN_KEYS = new Set([
  "isActive",
  "isOverride",
  "tenantPays",
  "includedInRent",
  "lastMonthRentDeposit",
  "autoSendStatements",
  "stripePaymentsEnabled",
]);

const DATE_KEY =
  /(?:At|Date)$|^moveInDate$|^moveOutDate$|^issueDate$|^dueDate$|^billingPeriodStart$|^billingPeriodEnd$|^maintenanceDate$|^paymentDate$|^leaseStartDate$|^leaseEndDate$|^emailSentAt$|^autoSentAt$|^sentToTenantAt$|^createdAt$|^updatedAt$/;

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes("--dry-run"),
    replace: argv.includes("--replace"),
    sqlitePath: process.env.SQLITE_PATH?.trim() || DEFAULT_SQLITE_PATH,
  };
}

function assertPostgresUrl() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    throw new Error(
      "DATABASE_URL must point at PostgreSQL. Set it in .env before importing."
    );
  }
}

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && value.trim() !== "") {
      return new Date(numeric);
    }
    return new Date(value);
  }
  throw new Error(`Unsupported date value: ${String(value)}`);
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      data[key] = null;
      continue;
    }
    if (BOOLEAN_KEYS.has(key)) {
      data[key] = Boolean(value);
      continue;
    }
    if (DATE_KEY.test(key)) {
      data[key] = parseDate(value);
      continue;
    }
    data[key] = value;
  }
  return data;
}

function readSqliteRows(db: Database.Database, table: string) {
  return db.prepare(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[];
}

function getDelegate(prisma: PrismaClient, model: ModelName) {
  return prisma[model] as unknown as {
    upsert: (args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
  };
}

async function importTable(
  prisma: PrismaClient,
  db: Database.Database,
  spec: TableModel,
  dryRun: boolean
) {
  const rows = readSqliteRows(db, spec.table);
  console.log(`  ${spec.table}: ${rows.length} row(s)`);

  if (dryRun || rows.length === 0) return;

  const delegate = getDelegate(prisma, spec.model);

  for (const row of rows) {
    const data = normalizeRow(row);
    const id = String(data.id);

    await delegate.upsert({
      where: { id },
      create: data,
      update: data,
    });
  }
}

async function clearPostgres(prisma: PrismaClient) {
  console.log("Clearing existing PostgreSQL data…");
  await prisma.user.deleteMany();
}

async function main() {
  const { dryRun, replace, sqlitePath } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(sqlitePath)) {
    throw new Error(
      `SQLite file not found: ${sqlitePath}\n` +
        "Copy your legacy dev.db to prisma/dev.db or set SQLITE_PATH."
    );
  }

  assertPostgresUrl();

  const db = new Database(sqlitePath, { readonly: true });
  const prisma = new PrismaClient();

  try {
    console.log(`Source: ${sqlitePath}`);
    console.log(`Target: ${process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ":***@")}`);
    if (dryRun) console.log("Mode: dry-run (no writes)");
    if (replace && !dryRun) console.log("Mode: replace (PostgreSQL data will be cleared first)");

    if (replace && !dryRun) {
      await clearPostgres(prisma);
    }

    console.log("Importing tables:");
    for (const spec of TABLE_MODELS) {
      await importTable(prisma, db, spec, dryRun);
    }

    if (dryRun) {
      console.log("\nDry run complete. Re-run without --dry-run to import.");
    } else {
      console.log("\nImport complete.");
    }
  } finally {
    db.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
