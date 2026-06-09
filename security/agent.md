# Security Controls

This document records every security control active in the app. Update it whenever a control is added, changed, or removed.

---

## Authentication

| Control | Detail | Location |
|---------|--------|----------|
| Brute-force lockout | 5 failed login attempts locks the account for 15 minutes | `src/lib/rate-limit.ts` |
| Generic error messages | Login failures always return `?error=invalid` — no hint whether email or password was wrong, and no indication of lockout state | `src/app/actions/auth.ts` |
| HMAC-SHA256 session tokens | Session cookie is signed with `SESSION_SECRET`; constant-time comparison prevents timing attacks | `src/lib/session-token.ts` |
| Secure session cookie | `httpOnly`, `SameSite=lax`; `Secure` flag enabled in production; 30-day expiry | `src/lib/auth.ts` |
| bcryptjs password hashing | Passwords hashed at 10 salt rounds on sign-up | `src/app/actions/auth.ts` |

## Bots & Crawlers

| Control | Detail | Location |
|---------|--------|----------|
| robots.txt | Disallows all crawlers (`*`) plus explicit rules for GPTBot, ClaudeBot, CCBot | `public/robots.txt` |

## Authorization

| Control | Detail | Location |
|---------|--------|----------|
| Route middleware | All dashboard and protected routes require a valid session; unauthenticated requests are redirected to `/sign-in` | `src/middleware.ts` |
| Server action guards | Every server action calls `requireUser()` then an ownership helper before touching the database — scopes all queries to the authenticated user | `src/lib/auth.ts`, `src/lib/ownership.ts` |

## Testing

Unit tests live in `src/lib/__tests__/`. Run with `npm test`.

| What is tested | File |
|----------------|------|
| Rate limiter (lockout logic, expiry, per-email isolation) | `src/lib/__tests__/rate-limit.test.ts` |

**Convention:** when a new security control is added as a pure library module (no framework dependencies), unit tests must be created alongside it in `src/lib/__tests__/`. Tests for controls that are tightly coupled to Next.js server actions or Prisma are covered by manual verification steps documented in the plan file.

---

## Planned / Future Controls

- Database credentials management via Neon (when hosted)
- CSRF protection review once the app is publicly hosted
- IP-based rate limiting at the edge/middleware layer for general traffic abuse
