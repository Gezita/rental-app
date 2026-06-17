import { NextResponse } from "next/server";
import { cloudDataBlockedResponse } from "@/lib/cloud-guard";
import { isLocalDataOnlyDeploy } from "@/lib/deploy-config";
import { prisma } from "@/lib/db";
import { runAutoBillingForUser } from "@/lib/auto-billing";
import { syncOverdueStatements } from "@/lib/overdue";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically.
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  // External schedulers (Railway, cron-job.org, etc.) can pass `?secret=` or
  // an `x-cron-secret` header instead.
  if (request.headers.get("x-cron-secret") === secret) return true;
  const querySecret = new URL(request.url).searchParams.get("secret");
  if (querySecret === secret) return true;

  return false;
}

async function handle(request: Request) {
  if (isLocalDataOnlyDeploy()) return cloudDataBlockedResponse();

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { settings: { autoSendStatements: true } },
    select: { id: true },
  });

  const summary = [];

  for (const user of users) {
    await syncOverdueStatements(user.id);
    const result = await runAutoBillingForUser(user.id);
    summary.push({ userId: user.id, ...result });
  }

  return NextResponse.json({ ok: true, users: summary.length, summary });
}

// Vercel Cron issues a GET request; external schedulers may use either.
export const GET = handle;
export const POST = handle;
