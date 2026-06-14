/** Safe post-auth redirect — blocks open redirects and auth loops. */
export function safeAuthRedirectPath(next: string | undefined | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  if (next.startsWith("/sign-in") || next.startsWith("/sign-up")) {
    return "/dashboard";
  }
  return next;
}
