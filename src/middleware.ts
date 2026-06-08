import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseSessionToken } from "@/lib/session-token";

const SESSION_COOKIE = "landlord_session";

const protectedPrefixes = [
  "/dashboard",
  "/properties",
  "/utility-bills",
  "/statements",
  "/notices",
  "/documents",
  "/maintenance",
  "/profile",
  "/settings",
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = await parseSessionToken(sessionCookie);
  const isAuthenticated = Boolean(userId);

  if (isProtectedPath(pathname) && !isAuthenticated) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/properties/:path*",
    "/utility-bills/:path*",
    "/statements/:path*",
    "/notices/:path*",
    "/documents/:path*",
    "/maintenance/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/sign-in",
    "/sign-up",
  ],
};
