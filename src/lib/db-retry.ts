import { Prisma } from "@prisma/client";

/**
 * Prisma error codes that indicate a transient connectivity problem rather than
 * a real data/query error. These are safe to retry — they typically happen when
 * a serverless Postgres (e.g. Neon) cold-starts, drops an idle connection, or
 * briefly hits its connection limit.
 */
const TRANSIENT_PRISMA_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Database server reached but timed out
  "P1008", // Operations timed out
  "P1017", // Server has closed the connection
]);

function isTransientDbError(error: unknown): boolean {
  // Thrown when the client can't establish an initial connection (cold start).
  if (error instanceof Prisma.PrismaClientInitializationError) return true;

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    TRANSIENT_PRISMA_CODES.has(error.code)
  ) {
    return true;
  }

  // Some pooler/socket failures surface as a generic error message.
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("can't reach database server") ||
      msg.includes("connection closed") ||
      msg.includes("connection terminated") ||
      msg.includes("econnreset")
    );
  }

  return false;
}

/**
 * Runs a database operation, retrying a small number of times on transient
 * connection failures with exponential backoff. Non-transient errors (real
 * query/data errors) are thrown immediately without retrying.
 *
 * Use this around the read queries that back a page render so a single
 * cold-start connection blip doesn't crash the whole page.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  { retries = 2, baseDelayMs = 150 }: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isTransientDbError(error)) throw error;
      const delay = baseDelayMs * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
