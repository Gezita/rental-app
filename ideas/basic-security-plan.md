# Basic Security Implementation Plan

## What & Why

Before hosting on the internet, three baseline controls are needed:
1. **Brute-force protection** on the login form
2. **robots.txt** to discourage AI crawlers and bots
3. Generic error messages on auth failures *(already done — `?error=invalid` redirect)*

The approach uses no new dependencies and no Redis — simple in-memory state suitable for a single-server deployment.

---

## 1. Create `src/lib/rate-limit.ts`

A new module with a module-level Map to track failed login attempts by email.

```ts
const LOCK_THRESHOLD = 5;               // failed attempts before lockout
const LOCK_DURATION  = 15 * 60 * 1000; // 15 minutes in ms

export function isLocked(email: string): boolean
export function recordFailure(email: string): void
export function clearAttempts(email: string): void
```

- `isLocked` — checks if email is currently locked out (auto-clears expired locks)
- `recordFailure` — increments counter, locks account when threshold is hit
- `clearAttempts` — resets state on successful login

> Note: State resets on server restart and is not shared across multiple instances. Fine for single-server hosting.

---

## 2. Update `src/app/actions/auth.ts` — `signInAction()`

Current flow (lines 49–64): normalise email → DB lookup → bcrypt compare → session or redirect.

New flow:
```
1. normalise email (already done)
2. if isLocked(email) → redirect ?error=invalid   ← same generic message, no lockout hint
3. DB lookup + bcrypt compare (existing)
4. on failure → recordFailure(email) → redirect ?error=invalid
5. on success → clearAttempts(email) → setSession → redirect
```

No new error messages — the existing generic `?error=invalid` covers the lockout case too, preventing information leakage.

---

## 3. Create `public/robots.txt`

```
User-agent: *
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: CCBot
Disallow: /
```

Next.js serves `/public` files statically at the root, so this will be available at `/robots.txt` automatically.

---

## 4. Create `security/agent.md` — Security Controls Log

A living document that records every security control in the app. Updated whenever a new control is added or changed.

Initial contents should cover:

```
# Security Controls

## Authentication
- Brute-force lockout: 5 failed attempts locks account for 15 minutes (src/lib/rate-limit.ts)
- Generic error messages on login failure — no enumeration of valid emails
- HMAC-SHA256 signed session tokens (src/lib/session-token.ts)
- httpOnly, SameSite=lax session cookie; Secure flag in production
- bcryptjs password hashing (10 salt rounds)

## Bots & Crawlers
- robots.txt disallows all crawlers including GPTBot, ClaudeBot, CCBot (public/robots.txt)

## Authorization
- Every server action calls requireUser() + ownership helper before any DB query (src/lib/ownership.ts)
- Middleware guards all dashboard routes, redirects unauthenticated users to /sign-in
```

---

## Files to change

| File | Action |
|------|--------|
| `src/lib/rate-limit.ts` | **Create** — rate limiter module |
| `src/app/actions/auth.ts` | **Edit** — add lock check + failure recording to `signInAction` |
| `public/robots.txt` | **Create** — bot disallow rules |
| `security/agent.md` | **Create** — security controls documentation |

---

## How to Verify

1. `make dev` — start the app
2. Submit wrong credentials 5 times on `/sign-in` — the 6th attempt should still return the generic "Invalid credentials" message
3. Log in with correct credentials after some failures — should succeed and reset the counter
4. Visit `http://localhost:3000/robots.txt` — confirm it renders correctly
