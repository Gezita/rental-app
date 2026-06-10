import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocalDataOnlyDeploy, isPublicLandingPath } from "@/lib/deploy-config";
import { parseSessionToken } from "@/lib/session-token";

const SESSION_COOKIE = "landlord_session";

const protectedPrefixes = [
  "/dashboard",
  "/properties",
  "/billing",
  "/tenants",
  "/inspections",
  "/documents",
  "/maintenance",
  "/settings",
  "/pay",
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isLocalDataOnlyDeploy()) {
    if (pathname.startsWith("/api/")) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error:
              "This hosted page does not store data. Install zigglo on your computer — see /get-started.",
          },
          { status: 403 }
        )
      );
    }

    if (pathname === "/") {
      return applySecurityHeaders(NextResponse.redirect(new URL("/get-started", request.url)));
    }

    if (!isPublicLandingPath(pathname)) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/get-started", request.url))
      );
    }

    return applySecurityHeaders(NextResponse.next());
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  const parsed = await parseSessionToken(sessionCookie);
  const isAuthenticated = Boolean(parsed);

  if (isProtectedPath(pathname) && !isAuthenticated) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(signInUrl));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
