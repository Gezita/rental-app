import { NextResponse } from "next/server";
import {
  summarizeGreenButtonSync,
  syncAllEnabledGreenButtonConnections,
} from "@/lib/green-button/sync";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await syncAllEnabledGreenButtonConnections();
  const summary = summarizeGreenButtonSync(results);

  return NextResponse.json({ ok: true, ...summary, details: results });
}
