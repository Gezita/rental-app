import type { GreenButtonProvider, UtilityType } from "@prisma/client";

export type GreenButtonProviderConfig = {
  id: GreenButtonProvider;
  label: string;
  utilityType: UtilityType;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  authorizePath: string;
  tokenPath: string;
  resourcePath: string;
};

const DEFAULT_SCOPE =
  "FB=13_14_15_16_17_18_19_20_21_22_23_24_25_26_27_28_29_30_31_32_33_34_35_37_38_39_40_41_44;IntervalDuration=3600;BlockDuration=monthly;HistoryLength=13";

function readEnv(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function buildConfig(
  id: GreenButtonProvider,
  label: string,
  utilityType: UtilityType,
  envPrefix: string,
  defaults: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    scope?: string;
  }
): GreenButtonProviderConfig | null {
  const baseUrl = readEnv(`${envPrefix}_BASE_URL`, defaults.baseUrl).replace(/\/$/, "");
  const clientId = readEnv(`${envPrefix}_CLIENT_ID`, defaults.clientId);
  const clientSecret = readEnv(`${envPrefix}_CLIENT_SECRET`, defaults.clientSecret);

  if (!baseUrl || !clientId || !clientSecret) return null;

  return {
    id,
    label,
    utilityType,
    baseUrl,
    clientId,
    clientSecret,
    scope: readEnv(`${envPrefix}_SCOPE`, defaults.scope ?? DEFAULT_SCOPE),
    authorizePath: readEnv(`${envPrefix}_AUTHORIZE_PATH`, "/DataCustodian/oauth/authorize"),
    tokenPath: readEnv(`${envPrefix}_TOKEN_PATH`, "/DataCustodian/oauth/token"),
    resourcePath: readEnv(`${envPrefix}_RESOURCE_PATH`, "/DataCustodian/espi/1_1/resource"),
  };
}

const PROVIDER_BUILDERS: Record<
  GreenButtonProvider,
  () => GreenButtonProviderConfig | null
> = {
  sandbox: () =>
    buildConfig("sandbox", "Green Button Sandbox", "electricity", "GREEN_BUTTON_SANDBOX", {
      baseUrl: "https://services.greenbuttondata.org",
      clientId: "third_party",
      clientSecret: "secret",
    }),
  enbridge: () =>
    buildConfig("enbridge", "Enbridge Gas", "gas", "GREEN_BUTTON_ENBRIDGE", {
      baseUrl: "",
      clientId: "",
      clientSecret: "",
    }),
  alectra: () =>
    buildConfig("alectra", "Alectra Utilities", "electricity", "GREEN_BUTTON_ALECTRA", {
      baseUrl: "",
      clientId: "",
      clientSecret: "",
    }),
};

export function getGreenButtonProvider(
  provider: GreenButtonProvider
): GreenButtonProviderConfig | null {
  return PROVIDER_BUILDERS[provider]();
}

export function getConfiguredGreenButtonProviders(): GreenButtonProviderConfig[] {
  return (["sandbox", "enbridge", "alectra"] as GreenButtonProvider[])
    .map((id) => getGreenButtonProvider(id))
    .filter((config): config is GreenButtonProviderConfig => config !== null);
}

export function isGreenButtonConfigured(): boolean {
  return getConfiguredGreenButtonProviders().length > 0;
}

export function getGreenButtonRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
  return `${appUrl}/api/green-button/callback`;
}

export function providerUrl(config: GreenButtonProviderConfig, path: string): string {
  return `${config.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function providerResourceUrl(
  config: GreenButtonProviderConfig,
  ...segments: string[]
): string {
  const base = config.resourcePath.replace(/\/$/, "");
  const suffix = segments.filter(Boolean).join("/");
  return `${config.baseUrl}${base}${suffix ? `/${suffix}` : ""}`;
}
