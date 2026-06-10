import { NextRequest, NextResponse } from "next/server";
import { cloudDataBlockedResponse } from "@/lib/cloud-guard";
import { isLocalDataOnlyDeploy } from "@/lib/deploy-config";
import { clearSession, SESSION_COOKIE } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (isLocalDataOnlyDeploy()) {
    return cloudDataBlockedResponse();
  }

  await clearSession();
  const response = NextResponse.redirect(new URL("/sign-in", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
