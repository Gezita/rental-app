import { NextResponse } from "next/server";
import { cloudDataBlockedResponse } from "@/lib/cloud-guard";
import { isLocalDataOnlyDeploy } from "@/lib/deploy-config";
import { prisma } from "@/lib/db";
import { runAutoBillingForUser } from "@/lib/auto-billing";
import { syncOverdueStatements } from "@/lib/overdue";

export async function POST(request: Request) {
  if (isLocalDataOnlyDeploy()) return cloudDataBlockedResponse();

  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
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
