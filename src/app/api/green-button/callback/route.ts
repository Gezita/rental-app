import { NextResponse } from "next/server";
import type { GreenButtonProvider } from "@prisma/client";
import { prisma } from "@/lib/db";
import { completeGreenButtonOAuth, consumeGreenButtonOAuthState } from "@/lib/green-button/oauth";
import { syncGreenButtonConnection } from "@/lib/green-button/sync";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

  if (providerError) {
    return NextResponse.redirect(
      `${appUrl}/settings?greenButton=error&reason=${encodeURIComponent(providerError)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?greenButton=error&reason=missing_code`);
  }

  const oauthState = await consumeGreenButtonOAuthState(state);
  if (!oauthState) {
    return NextResponse.redirect(`${appUrl}/settings?greenButton=error&reason=invalid_state`);
  }

  const property = await prisma.property.findFirst({
    where: { id: oauthState.propertyId, userId: oauthState.userId },
  });
  if (!property) {
    return NextResponse.redirect(`${appUrl}/settings?greenButton=error&reason=property_not_found`);
  }

  try {
    const connection = await completeGreenButtonOAuth(
      oauthState.provider as GreenButtonProvider,
      oauthState.propertyId,
      code
    );

    await syncGreenButtonConnection(connection.id);

    return NextResponse.redirect(
      `${appUrl}/properties/${oauthState.propertyId}/utility-connect?connected=${oauthState.provider}`
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : "oauth_failed";
    return NextResponse.redirect(
      `${appUrl}/properties/${oauthState.propertyId}/utility-connect?error=${encodeURIComponent(reason)}`
    );
  }
}
