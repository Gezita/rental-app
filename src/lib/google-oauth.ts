import { getAppUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type GoogleOAuthState = {
  nonce: string;
  next: string;
  exp: number;
};

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

export type GoogleUserProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET ?? "dev-secret-change-in-production";
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return secret;
}

async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLength), "base64").toString("utf8");
}

export function isGoogleAuthEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleRedirectUri(): string {
  return `${getAppUrl()}/api/auth/google/callback`;
}

export async function createGoogleOAuthState(next?: string): Promise<string> {
  const payload: GoogleOAuthState = {
    nonce: crypto.randomUUID(),
    next: next || "/dashboard",
    exp: Date.now() + OAUTH_STATE_TTL_MS,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = await signPayload(encoded);
  return `${encoded}.${signature}`;
}

export async function parseGoogleOAuthState(
  state: string | null
): Promise<GoogleOAuthState | null> {
  if (!state) return null;

  const dot = state.lastIndexOf(".");
  if (dot <= 0) return null;

  const encoded = state.slice(0, dot);
  const signature = state.slice(dot + 1);
  if (!encoded || !signature) return null;

  const expected = await signPayload(encoded);
  if (signature.length !== expected.length) return null;

  let mismatch = 0;
  for (let i = 0; i < signature.length; i += 1) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(encoded)) as GoogleOAuthState;
    if (!parsed?.nonce || !parsed?.next || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getGoogleAuthorizationUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange Google authorization code");
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserProfile> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Google user profile");
  }

  const profile = (await response.json()) as GoogleUserProfile;
  if (!profile.sub || !profile.email || !profile.email_verified) {
    throw new Error("Google account email is not verified");
  }

  return profile;
}

export async function findOrCreateGoogleUser(profile: GoogleUserProfile) {
  const email = profile.email.toLowerCase();

  const byGoogleId = await prisma.user.findUnique({ where: { googleId: profile.sub } });
  if (byGoogleId) {
    if (byGoogleId.email !== email) {
      throw new Error("Google account email mismatch");
    }
    return byGoogleId;
  }

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    if (byEmail.googleId && byEmail.googleId !== profile.sub) {
      throw new Error("Email is linked to a different Google account");
    }

    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: profile.sub,
        name: byEmail.name || profile.name || undefined,
      },
    });
  }

  const displayName = profile.name || email.split("@")[0];

  return prisma.user.create({
    data: {
      email,
      googleId: profile.sub,
      name: profile.name || undefined,
      settings: {
        create: {
          landlordName: displayName,
          paymentInstructions: "Please contact your landlord for payment details.",
        },
      },
    },
  });
}
