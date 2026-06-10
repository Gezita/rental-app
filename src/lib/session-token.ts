const DEFAULT_SECRET = "dev-secret-change-in-production";

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET ?? DEFAULT_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (secret === DEFAULT_SECRET) {
      throw new Error("SESSION_SECRET must be set in production");
    }
    if (secret.length < 32) {
      throw new Error("SESSION_SECRET must be at least 32 characters");
    }
  }
  return secret;
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(signature);
}

// Token format: {userId}.{nonce}.{hmac(userId:nonce)}
// cuid IDs and hex strings contain no dots, so splitting on "." gives exactly 3 parts.

export async function createSessionToken(userId: string, nonce: string): Promise<string> {
  const signature = await sign(`${userId}:${nonce}`);
  return `${userId}.${nonce}.${signature}`;
}

export async function parseSessionToken(
  token: string | undefined
): Promise<{ userId: string; nonce: string } | null> {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, nonce, signature] = parts;
  if (!userId || !nonce || !signature) return null;

  const expected = await sign(`${userId}:${nonce}`);
  if (signature.length !== expected.length) return null;

  let mismatch = 0;
  for (let i = 0; i < signature.length; i += 1) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  return mismatch === 0 ? { userId, nonce } : null;
}
