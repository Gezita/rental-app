function envFlag(name: string): boolean {
  const value = process.env[name];
  return value === "1" || value === "true";
}

/** Vercel landing deploy — no cloud database or user data unless opted in. */
export function isLocalDataOnlyDeploy(): boolean {
  if (envFlag("ALLOW_CLOUD_DATA")) return false;
  if (envFlag("LOCAL_DATA_ONLY")) return true;
  if (process.env.VERCEL === "1") return true;
  return false;
}

/** Paths allowed on a local-data-only (hosted landing) deploy. */
export function isPublicLandingPath(pathname: string): boolean {
  if (
    pathname === "/get-started" ||
    pathname === "/offline" ||
    pathname === "/manifest.webmanifest"
  ) {
    return true;
  }

  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return true;
  }

  if (
    pathname.startsWith("/brand/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/samples/")
  ) {
    return true;
  }

  return false;
}
