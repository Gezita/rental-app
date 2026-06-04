import type { GreenButtonConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  extractAtomLink,
  parseUsageSummariesFromFeed,
  type ParsedUsageSummary,
} from "@/lib/green-button/parse-espi";
import {
  getGreenButtonProvider,
  providerResourceUrl,
  providerUrl,
  type GreenButtonProviderConfig,
} from "@/lib/green-button/providers";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  resourceURI?: string;
  resource_uri?: string;
  subscriptionURI?: string;
  subscription_uri?: string;
};

export class GreenButtonClient {
  constructor(
    private config: GreenButtonProviderConfig,
    private connection: GreenButtonConnection
  ) {}

  static forConnection(connection: GreenButtonConnection): GreenButtonClient | null {
    const config = getGreenButtonProvider(connection.provider);
    if (!config) return null;
    return new GreenButtonClient(config, connection);
  }

  private async ensureAccessToken(): Promise<string> {
    if (!this.connection.accessToken) {
      throw new Error("Green Button connection is missing an access token");
    }

    const expiresAt = this.connection.tokenExpiresAt?.getTime() ?? 0;
    const refreshThresholdMs = 5 * 60 * 1000;
    if (Date.now() < expiresAt - refreshThresholdMs) {
      return this.connection.accessToken;
    }

    if (!this.connection.refreshToken) {
      return this.connection.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.connection.refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const response = await fetch(providerUrl(this.config, this.config.tokenPath), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Green Button token refresh failed: ${response.status} ${text}`);
    }

    const token = (await response.json()) as TokenResponse;
    const tokenExpiresAt =
      typeof token.expires_in === "number"
        ? new Date(Date.now() + token.expires_in * 1000)
        : null;

    this.connection = await prisma.greenButtonConnection.update({
      where: { id: this.connection.id },
      data: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token ?? this.connection.refreshToken,
        tokenExpiresAt,
        scope: token.scope ?? this.connection.scope,
        status: "connected",
      },
    });

    return this.connection.accessToken!;
  }

  private async fetchXml(url: string): Promise<string> {
    const token = await this.ensureAccessToken();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/atom+xml, application/xml, text/xml, */*",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Green Button request failed (${response.status}): ${text.slice(0, 300)}`);
    }

    return response.text();
  }

  async discoverSubscriptionAndUsagePoint(): Promise<{
    subscriptionId?: string;
    usagePointId?: string;
    accountLabel?: string;
  }> {
    if (this.connection.subscriptionId && this.connection.usagePointId) {
      return {
        subscriptionId: this.connection.subscriptionId,
        usagePointId: this.connection.usagePointId,
        accountLabel: this.connection.accountLabel ?? undefined,
      };
    }

    const resourceUri = this.connection.resourceUri;
    if (resourceUri) {
      const xml = await this.fetchXml(resourceUri);
      const subscriptionLink = extractAtomLink(xml, "self") ?? resourceUri;
      const ids = subscriptionLink.match(/Subscription\/([^/]+)/i);
      if (ids?.[1]) {
        const usagePointsXml = await this.fetchXml(
          providerResourceUrl(this.config, "Subscription", ids[1], "UsagePoint")
        );
        const usagePointLink = extractAtomLink(usagePointsXml, "self");
        const usagePointId = usagePointLink?.match(/UsagePoint\/([^/]+)/i)?.[1];
        const title = usagePointsXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();

        return {
          subscriptionId: ids[1],
          usagePointId,
          accountLabel: title,
        };
      }
    }

    const subscriptionsXml = await this.fetchXml(
      providerResourceUrl(this.config, "Subscription")
    );
    const subscriptionLink = extractAtomLink(subscriptionsXml, "self");
    const subscriptionId = subscriptionLink?.match(/Subscription\/([^/]+)/i)?.[1];
    if (!subscriptionId) return {};

    const usagePointsXml = await this.fetchXml(
      providerResourceUrl(this.config, "Subscription", subscriptionId, "UsagePoint")
    );
    const usagePointLink = extractAtomLink(usagePointsXml, "self");
    const usagePointId = usagePointLink?.match(/UsagePoint\/([^/]+)/i)?.[1];
    const title = usagePointsXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();

    return { subscriptionId, usagePointId, accountLabel: title };
  }

  async fetchUsageSummaries(): Promise<ParsedUsageSummary[]> {
    const discovered = await this.discoverSubscriptionAndUsagePoint();
    const subscriptionId = discovered.subscriptionId ?? this.connection.subscriptionId;
    const usagePointId = discovered.usagePointId ?? this.connection.usagePointId;

    if (subscriptionId && usagePointId) {
      const url = providerResourceUrl(
        this.config,
        "Subscription",
        subscriptionId,
        "UsagePoint",
        usagePointId,
        "UsageSummary"
      );
      const xml = await this.fetchXml(url);
      return parseUsageSummariesFromFeed(xml);
    }

    if (this.connection.resourceUri) {
      const xml = await this.fetchXml(this.connection.resourceUri);
      return parseUsageSummariesFromFeed(xml);
    }

    throw new Error("Unable to determine Green Button subscription or usage point");
  }
}

export async function exchangeAuthorizationCode(
  config: GreenButtonProviderConfig,
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(providerUrl(config, config.tokenPath), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Green Button token exchange failed: ${response.status} ${text}`);
  }

  return (await response.json()) as TokenResponse;
}
