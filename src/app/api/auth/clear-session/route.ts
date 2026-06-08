import { NextRequest, NextResponse } from "next/server";
import { clearSession, SESSION_COOKIE } from "@/lib/auth";

export async function GET(request: NextRequest) {
  await clearSession();
  const response = NextResponse.redirect(new URL("/sign-in", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
