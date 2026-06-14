import { NextRequest, NextResponse } from "next/server";
import { safeAuthRedirectPath } from "@/lib/auth-redirect";
import { setSession } from "@/lib/auth";
import { cloudDataBlockedResponse } from "@/lib/cloud-guard";
import { isLocalDataOnlyDeploy } from "@/lib/deploy-config";
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  findOrCreateGoogleUser,
  parseGoogleOAuthState,
} from "@/lib/google-oauth";

function googleErrorRedirect(request: NextRequest, next?: string): NextResponse {
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("error", "google");
  if (next) {
    url.searchParams.set("next", safeAuthRedirectPath(next));
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  if (isLocalDataOnlyDeploy()) {
    return cloudDataBlockedResponse();
  }

  const { searchParams } = request.nextUrl;

  if (searchParams.get("error")) {
    return googleErrorRedirect(request, searchParams.get("next") || undefined);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const parsedState = await parseGoogleOAuthState(state);
  if (!code || !parsedState) {
    return googleErrorRedirect(request);
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    const profile = await fetchGoogleUserInfo(tokens.access_token);
    const user = await findOrCreateGoogleUser(profile);
    await setSession(user.id);
    return NextResponse.redirect(
      new URL(safeAuthRedirectPath(parsedState.next), request.url)
    );
  } catch {
    return googleErrorRedirect(request, parsedState.next);
  }
}
