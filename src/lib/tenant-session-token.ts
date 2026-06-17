import { createSessionToken, parseSessionToken } from "@/lib/session-token";

export const TENANT_SESSION_COOKIE = "tenant_session";

export async function createTenantSessionToken(
  tenantId: string,
  nonce: string
): Promise<string> {
  return createSessionToken(tenantId, nonce);
}

export async function parseTenantSessionToken(token: string | undefined) {
  return parseSessionToken(token);
}
