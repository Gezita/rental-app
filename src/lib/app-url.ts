/** Public app URL — Stripe redirects, tenant pay links, canonical host redirects. */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getCanonicalOrigin(): URL | null {
  try {
    return new URL(getAppUrl());
  } catch {
    return null;
  }
}

/** Redirect alternate hosts (e.g. *.railway.app, www) to NEXT_PUBLIC_APP_URL in production. */
export function shouldRedirectToCanonicalHost(requestHost: string | null): URL | null {
  if (process.env.NODE_ENV !== "production" || !requestHost) return null;

  const canonical = getCanonicalOrigin();
  if (!canonical) return null;

  if (requestHost === canonical.host) return null;

  return canonical;
}
