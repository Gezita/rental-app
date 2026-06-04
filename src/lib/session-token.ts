const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "dev-secret-change-in-production";

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signUserId(userId: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(userId)
  );

  return toHex(signature);
}

export async function createSessionToken(userId: string): Promise<string> {
  const signature = await signUserId(userId);
  return `${userId}.${signature}`;
}

export async function parseSessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;

  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex <= 0) return null;

  const userId = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  if (!userId || !signature) return null;

  const expected = await signUserId(userId);
  if (signature.length !== expected.length) return null;

  let valid = true;
  for (let i = 0; i < signature.length; i += 1) {
    if (signature.charCodeAt(i) !== expected.charCodeAt(i)) {
      valid = false;
    }
  }

  return valid ? userId : null;
}
