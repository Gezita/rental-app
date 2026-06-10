import { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV === "production") {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const isPostgres = dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://");
  const isLocalhost = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");
  if (isPostgres && !isLocalhost && !dbUrl.includes("sslmode=require") && !dbUrl.includes("sslmode=verify-full")) {
    throw new Error("DATABASE_URL must include sslmode=require in production");
  }

  if (!process.env.CRON_SECRET) {
    console.warn("[security] CRON_SECRET is not set — /api/cron/auto-billing is unprotected");
  } else if (process.env.CRON_SECRET.length < 32) {
    console.warn("[security] CRON_SECRET should be at least 32 characters");
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    transactionOptions: {
      timeout: 10000,
      maxWait: 5000,
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
