# Database & Web App Security Hardening Plan

## Context

Extension of the parameterized queries idea in `database-security.md` into a full security hardening pass for the rental app's database connection and web-app surface.

**Already solid — no changes needed:**
- Prisma ORM handles parameterized queries transparently; no raw SQL found in `src/`
- Zod validation on every server action (`src/lib/validation.ts`)
- HMAC-SHA256 signed session cookies (`src/lib/session-token.ts`)
- Ownership guards on every DB access (`src/lib/ownership.ts`)
- bcryptjs password hashing (10 rounds)
- `poweredByHeader: false` in `next.config.ts`

**Gaps this plan addresses:**
1. Missing HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
2. In-memory rate limiter resets on restart — not safe for production
3. No SSL enforcement on `DATABASE_URL` in production config
4. No query timeout on the Prisma client
5. `CRON_SECRET` not validated at startup (unlike `SESSION_SECRET`)
6. File upload content not verified against magic bytes (only extension checked)
7. No session rotation after login (session fixation risk)

---

## Implementation Plan

### 1. HTTP Security Headers (Quick Win — ~30 min)

**File:** `next.config.ts`

Add a `headers()` export with security headers applied to all routes (`source: '/(.*)'`):

| Header | Value |
|--------|-------|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | See directives below |

**CSP directives:**
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self' https://api.stripe.com;
frame-src https://js.stripe.com;
object-src 'none';
base-uri 'self'
```

> `unsafe-inline` is needed for Next.js inline scripts — can be tightened later with nonces.

**Verify:** `curl -I http://localhost:3000` — check headers appear. Run [securityheaders.com](https://securityheaders.com) against the deployed URL.

---

### 2. Database-backed Rate Limiting (~2h)

**Files:** `src/lib/rate-limit.ts`, `prisma/schema.prisma`

Current in-memory store loses state on server restart. Replace with a PostgreSQL-backed `LoginAttempt` table.

**Schema addition:**
```prisma
model LoginAttempt {
  id         String   @id @default(cuid())
  identifier String
  createdAt  DateTime @default(now())

  @@index([identifier, createdAt])
}
```

**New `rate-limit.ts` logic:**
- `recordFailure(email)` — INSERT into `LoginAttempt`
- `isLocked(email)` — COUNT rows WHERE `identifier = email AND createdAt > now() - 15min` ≥ 5
- `clearAttempts(email)` — DELETE WHERE `identifier = email`
- Cleanup: DELETE rows older than 24h inside `isLocked`

Keep the same public API (`isLocked`, `recordFailure`, `clearAttempts`) — `src/app/actions/auth.ts` needs no changes.

**Migration:** `npm run db:migrate`

**Verify:** Run existing rate-limit tests; confirm lockout survives a server restart.

---

### 3. DATABASE_URL SSL Enforcement (Quick Win — ~20 min)

**Files:** `.env.example`, `src/lib/db.ts`

Add a startup check in `src/lib/db.ts`:

```ts
if (process.env.NODE_ENV === 'production') {
  const dbUrl = process.env.DATABASE_URL ?? '';
  if (!dbUrl.includes('sslmode=require') && !dbUrl.includes('sslmode=verify-full')) {
    throw new Error('DATABASE_URL must include sslmode=require in production');
  }
}
```

Update `.env.example` to document that the production URL must include `?sslmode=require`.

**Verify:** Set `NODE_ENV=production` with a plain `DATABASE_URL` — confirm the app throws at startup.

---

### 4. Prisma Query Timeout (Quick Win — ~15 min)

**File:** `src/lib/db.ts`

```ts
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  transactionOptions: {
    timeout: 10000,  // 10s max for transactions
    maxWait: 5000,
  },
});
```

Also document appending `?statement_timeout=10000` to `DATABASE_URL` in `.env.example` for statement-level enforcement.

---

### 5. CRON_SECRET Startup Validation (Quick Win — ~10 min)

**File:** `src/lib/db.ts` or alongside the `SESSION_SECRET` check in `src/lib/session-token.ts`

```ts
if (process.env.NODE_ENV === 'production' && !process.env.CRON_SECRET) {
  console.warn('[security] CRON_SECRET is not set — /api/cron/auto-billing is unprotected');
}
```

Add minimum-length checks (≥ 32 chars) for both `SESSION_SECRET` and `CRON_SECRET`.

---

### 6. File Upload Magic Byte Validation (~1h)

**Files:** `src/lib/files.ts`, the upload server action

Install: `npm install file-type`

```ts
import { fileTypeFromBuffer } from 'file-type';

const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/heic']);

async function validateFileContent(buffer: Buffer): Promise<void> {
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !allowedMimeTypes.has(type.mime)) {
    throw new Error('File content does not match an allowed type');
  }
}
```

Call after reading the buffer, before writing to disk.

**Verify:** Upload a renamed executable as a `.jpg` — confirm it is rejected.

---

### 7. Session Rotation on Login (~45 min)

**Files:** `src/lib/auth.ts`, `src/app/actions/auth.ts`

After a successful sign-in, issue a fresh session token before the redirect. This prevents session fixation (an attacker cannot pre-seed a session and have it elevated on login).

Add a `rotateSession(userId)` helper in `src/lib/auth.ts` that clears the old cookie and writes a new one. Call it from the sign-in action after `bcrypt.compare` succeeds.

**Verify:** Sign in, note cookie value → sign out → sign in again → confirm cookie value changed.

---

## Priority Order

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | HTTP Security Headers | 30 min | High |
| 2 | DATABASE_URL SSL check | 20 min | High |
| 3 | CRON_SECRET validation | 10 min | Medium |
| 4 | Prisma query timeout | 15 min | Medium |
| 5 | DB-backed rate limiting | 2h | High |
| 6 | Session rotation | 45 min | Medium |
| 7 | Magic byte validation | 1h | Low–Medium |

Items 1–4 are quick wins shippable in a single PR. Items 5–7 are follow-on work.

---

## Parameterized Queries (from `database-security.md`)

Prisma's query builder **already uses parameterized queries** for all operations — confirmed, no SQL injection vectors in `src/`. No code changes needed. ✅

If raw SQL is ever needed (e.g. a complex report), use `prisma.$queryRaw` with Prisma tagged templates (`Prisma.sql\`...\``) which enforce parameterization — never string concatenation.

---

## Verification Checklist

- [ ] `curl -I http://localhost:3000` shows `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`
- [ ] securityheaders.com returns A or B on production URL
- [ ] Wrong password 5× → lockout persists across server restart
- [ ] Production boot with plain `DATABASE_URL` → startup throws
- [ ] Production boot without `CRON_SECRET` → warning logged
- [ ] Upload a renamed executable as `.jpg` → rejected
- [ ] Sign in → note cookie → sign in again → cookie value changed
