import { randomBytes } from "crypto";
import type { GreenButtonProvider } from "@prisma/client";
import { prisma } from "@/lib/db";
import { exchangeAuthorizationCode, GreenButtonClient } from "@/lib/green-button/client";
import { extractResourceUrisFromTokenBody } from "@/lib/green-button/parse-espi";
import {
  getGreenButtonProvider,
  getGreenButtonRedirectUri,
  providerUrl,
} from "@/lib/green-button/providers";

const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

export async function createGreenButtonOAuthState(
  userId: string,
  propertyId: string,
  provider: GreenButtonProvider
): Promise<string> {
  const state = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);

  await prisma.greenButtonOAuthState.create({
    data: {
      userId,
      propertyId,
      provider,
      state,
      expiresAt,
    },
  });

  return state;
}

export async function consumeGreenButtonOAuthState(state: string) {
  const record = await prisma.greenButtonOAuthState.findUnique({
    where: { state },
  });

  if (!record) return null;
  await prisma.greenButtonOAuthState.delete({ where: { id: record.id } });

  if (record.expiresAt.getTime() < Date.now()) return null;
  return record;
}

export function buildGreenButtonAuthorizeUrl(
  provider: GreenButtonProvider,
  state: string
): string | null {
  const config = getGreenButtonProvider(provider);
  if (!config) return null;

  const redirectUri = getGreenButtonRedirectUri();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scope,
    state,
  });

  return `${providerUrl(config, config.authorizePath)}?${params.toString()}`;
}

export async function completeGreenButtonOAuth(
  provider: GreenButtonProvider,
  propertyId: string,
  code: string
) {
  const config = getGreenButtonProvider(provider);
  if (!config) {
    throw new Error("Green Button provider is not configured");
  }

  const redirectUri = getGreenButtonRedirectUri();
  const token = await exchangeAuthorizationCode(config, code, redirectUri);
  const resourceUris = extractResourceUrisFromTokenBody(token);
  const tokenExpiresAt =
    typeof token.expires_in === "number"
      ? new Date(Date.now() + token.expires_in * 1000)
      : null;

  const connection = await prisma.greenButtonConnection.upsert({
    where: {
      propertyId_provider_utilityType: {
        propertyId,
        provider,
        utilityType: config.utilityType,
      },
    },
    create: {
      propertyId,
      provider,
      utilityType: config.utilityType,
      status: "connected",
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenExpiresAt,
      scope: token.scope,
      resourceUri: resourceUris[0],
    },
    update: {
      status: "connected",
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenExpiresAt,
      scope: token.scope,
      resourceUri: resourceUris[0] ?? undefined,
      lastSyncError: null,
    },
  });

  const client = GreenButtonClient.forConnection(connection);
  if (client) {
    try {
      const discovered = await client.discoverSubscriptionAndUsagePoint();
      if (discovered.subscriptionId || discovered.usagePointId || discovered.accountLabel) {
        await prisma.greenButtonConnection.update({
          where: { id: connection.id },
          data: {
            subscriptionId: discovered.subscriptionId,
            usagePointId: discovered.usagePointId,
            accountLabel: discovered.accountLabel,
          },
        });
      }
    } catch {
      // Discovery can fail on some custodians until the first sync; connection still saved.
    }
  }

  return connection;
}
