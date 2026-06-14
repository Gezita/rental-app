import { afterEach, describe, expect, it } from "vitest";
import {
  createGoogleOAuthState,
  getGoogleAuthorizationUrl,
  getGoogleRedirectUri,
  isGoogleAuthEnabled,
  parseGoogleOAuthState,
} from "./google-oauth";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("google-oauth", () => {
  it("is disabled without credentials", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(isGoogleAuthEnabled()).toBe(false);
  });

  it("is enabled with credentials", () => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    expect(isGoogleAuthEnabled()).toBe(true);
  });

  it("round-trips signed OAuth state", async () => {
    process.env.SESSION_SECRET = "test-secret-at-least-32-characters-long";
    const state = await createGoogleOAuthState("/billing");
    const parsed = await parseGoogleOAuthState(state);
    expect(parsed?.next).toBe("/billing");
    expect(parsed?.nonce).toBeTruthy();
  });

  it("rejects tampered OAuth state", async () => {
    process.env.SESSION_SECRET = "test-secret-at-least-32-characters-long";
    const state = await createGoogleOAuthState("/dashboard");
    const tampered = `${state}x`;
    expect(await parseGoogleOAuthState(tampered)).toBeNull();
  });

  it("builds Google authorization URL", () => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    const url = new URL(getGoogleAuthorizationUrl("signed-state"));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(getGoogleRedirectUri());
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("scope")).toContain("email");
  });
});
