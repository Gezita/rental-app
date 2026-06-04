import { NextResponse } from "next/server";
import type { GreenButtonProvider } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import {
  buildGreenButtonAuthorizeUrl,
  createGreenButtonOAuthState,
} from "@/lib/green-button/oauth";
import { getGreenButtonProvider } from "@/lib/green-button/providers";

const VALID_PROVIDERS = new Set<GreenButtonProvider>(["sandbox", "enbridge", "alectra"]);

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId") ?? "";
  const provider = url.searchParams.get("provider") as GreenButtonProvider;

  if (!propertyId || !VALID_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId },
  });
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const config = getGreenButtonProvider(provider);
  if (!config) {
    return NextResponse.json(
      { error: `${provider} Green Button credentials are not configured` },
      { status: 503 }
    );
  }

  const state = await createGreenButtonOAuthState(userId, propertyId, provider);
  const authorizeUrl = buildGreenButtonAuthorizeUrl(provider, state);
  if (!authorizeUrl) {
    return NextResponse.json({ error: "Unable to build authorization URL" }, { status: 500 });
  }

  return NextResponse.redirect(authorizeUrl);
}
