import { NextRequest, NextResponse } from "next/server";
import { safeAuthRedirectPath } from "@/lib/auth-redirect";
import { cloudDataBlockedResponse } from "@/lib/cloud-guard";
import { isLocalDataOnlyDeploy } from "@/lib/deploy-config";
import {
  createGoogleOAuthState,
  getGoogleAuthorizationUrl,
  isGoogleAuthEnabled,
} from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  if (isLocalDataOnlyDeploy()) {
    return cloudDataBlockedResponse();
  }

  if (!isGoogleAuthEnabled()) {
    return NextResponse.redirect(new URL("/sign-in?error=google", request.url));
  }

  const next = request.nextUrl.searchParams.get("next") || undefined;
  const state = await createGoogleOAuthState(safeAuthRedirectPath(next));
  const authUrl = getGoogleAuthorizationUrl(state);
  return NextResponse.redirect(authUrl);
}
