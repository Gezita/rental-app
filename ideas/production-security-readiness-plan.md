# Production Security Readiness Plan

## Context

The app has a solid security baseline already in place (documented in `security/agent.md`). This plan covers what remains before the app is safe to expose to real users in production. It is organised by security domain, not by infrastructure phase — each section records what is done, what is pending, and the specific code or config change needed.

---

## 1. Authentication & Session Security

### Done
- HMAC-SHA256 signed session cookies (`src/lib/session-token.ts`)
- `httpOnly`, `SameSite=Lax`, `Secure` flag in production (`src/lib/auth.ts`)
- bcryptjs password hashing at 10 rounds (`src/app/actions/auth.ts`)
- Generic error messages on login — no enumeration of valid emails (`src/app/actions/auth.ts`)
- Brute-force lockout: 5 failed attempts → 15-minute lock (`src/lib/rate-limit.ts`)

### Pending
- **SESSION_SECRET must be set before deploy.** The app throws at startup if `SESSION_SECRET` is the default placeholder in production. Generate with:
  ```bash
  openssl rand -hex 32
  ```
  Set as a Vercel environment variable. Never commit it.

---

## 2. Authorisation

### Done
- Route middleware: all dashboard routes require a valid session; unauthenticated → `/sign-in` (`src/middleware.ts`)
- Every server action calls `requireUser()` then an ownership helper before any DB query (`src/lib/auth.ts`, `src/lib/ownership.ts`)
- All DB queries scoped by `userId` — no cross-tenant data leakage

### Pending
- **CSRF review:** Next.js Server Actions enforce same-origin via `SameSite=Lax` + the framework's built-in origin header check. No additional work needed for this app's threat model.

---

## 3. Transport Security

### Done
- HSTS header: `max-age=63072000; includeSubDomains; preload` (`next.config.ts`)
- `X-Frame-Options: DENY` — clickjacking protection
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: camera, microphone, geolocation all denied
- Content Security Policy: strict `self`-only with allowlist for Stripe (`frame-src https://js.stripe.com`)

### Pending
- **Verify headers are live after first deploy:**
  ```bash
  curl -I https://yourdomain.com | grep -E "strict-transport|x-frame|x-content|content-security"
  ```
- **`NEXT_PUBLIC_APP_URL`** must be set to the production HTTPS domain — used for Stripe redirects and tenant pay links.

---

## 4. API Endpoint Protection

### Done
- Stripe webhook: signature verification via `stripe.webhooks.constructEvent` before processing

### Pending

#### 4a — CRON_SECRET enforcement (blocker)
**File:** `src/app/api/cron/auto-billing/route.ts`

Currently only a `console.warn` if `CRON_SECRET` is unset. The endpoint must return 401 if the secret is missing or mismatched — an empty string must not be treated as valid. Verify the guard cannot be bypassed:

```ts
const secret = process.env.CRON_SECRET;
if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
  return new Response("Unauthorized", { status: 401 });
}
```

Generate a strong secret: `openssl rand -hex 32` → set in Vercel env vars.

#### 4b — Stripe webhook idempotency race condition
**File:** `src/app/api/stripe/webhook/route.ts`

The `findFirst` + create pattern is vulnerable to parallel webhook deliveries recording the same payment twice. Wrap in a Prisma transaction and rely on the unique constraint on `referenceNumber` to reject duplicates at the DB level.

#### 4c — DocuSign webhook: silent error suppression
**File:** `src/app/api/docusign/webhook/route.ts`

Errors are caught and swallowed silently. Log them so failures are visible, while still returning 200 (required to prevent DocuSign retries):

```ts
} catch (e) {
  console.error("[docusign webhook] processing error:", e);
  return NextResponse.json({ received: true }); // must stay 200
}
```

---

## 5. Secrets & Credentials Management

### Done
- `.env` excluded from git (`.gitignore`)
- `SESSION_SECRET` validated at startup — hard throw if default value used in production
- `CRON_SECRET` warning if unset (needs upgrading to hard 401 — see 4a)

### Pending
- Set all required secrets in Vercel environment variables before first deploy:

| Variable | How to generate / where to get |
|---|---|
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `DATABASE_URL` | Neon dashboard connection string |
| `STRIPE_SECRET_KEY` | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook config |
| `RESEND_API_KEY` | Resend dashboard |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare R2 API token |

- **Database credentials:** use Neon (serverless Postgres) — credentials are environment-variable-only, never in source. Connection string format: `postgresql://...?sslmode=require`

---

## 6. Email Security (Blocking for Production)

### Done
- Email sending stub in place (`src/server/emails/send.ts`) — currently logs to console only

### Pending

**Email is a complete stub — nothing is sent in production today.** Replace with Resend before launch:

1. Sign up at [resend.com](https://resend.com) — free tier: 3,000 emails/month
2. Verify your sending domain (DNS TXT + MX records) — required to avoid spam classification
3. Set `RESEND_API_KEY` in Vercel env vars
4. Update `src/server/emails/send.ts` to call the Resend API when the key is present (fall back to console.log stub in dev when key is absent)

**Email error isolation:** Email failures in `record-payment.ts` and `statement-send.ts` currently propagate and can abort a successfully recorded payment. Wrap all `sendEmail()` calls in try-catch so a failed email doesn't roll back a completed transaction.

---

## 7. File Upload Security

### Done
- File type validation on upload (from security hardening work)
- Server-side validation before write

### Pending
- **Local filesystem is wiped on every Vercel deploy** — uploaded files (leases, maintenance photos) and generated PDFs are lost. Move to Cloudflare R2 (S3-compatible object storage):
  - `src/lib/files.ts` — replace `fs.writeFile`/`fs.readFile` with R2 upload/download
  - `src/lib/pdf.ts` — write generated PDFs to R2 instead of `./uploads/`
  - `src/app/api/documents/[id]/route.ts` — serve files via presigned R2 URLs (1-hour expiry) rather than streaming from disk
- This is also a security improvement: files are not accessible via guessable local paths

---

## 8. Bot & Crawler Protection

### Done
- `public/robots.txt` — disallows all crawlers; explicit rules for GPTBot, ClaudeBot, CCBot

### Pending
- **IP-based rate limiting at the edge** — the current brute-force lockout is per-email at the application layer. For general abuse (scraping, credential stuffing at scale), consider adding Vercel's edge middleware rate limiting or Cloudflare in front of the app. Lower priority — existing lockout covers the critical path.

---

## 9. Vercel Cron Security

### Pending
Add Vercel Cron to `vercel.json` so auto-billing runs on a schedule without exposing the endpoint publicly:

```json
{
  "crons": [{
    "path": "/api/cron/auto-billing",
    "schedule": "0 9 1 * *"
  }]
}
```

Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` from its own infrastructure — the endpoint never needs to be called externally.

---

## 10. Observability (Security-relevant)

### Pending
Production errors in webhooks and cron jobs currently disappear silently. Silent failures are a security concern — a broken Stripe webhook means unrecorded payments; a broken auth flow might not surface.

- Add error monitoring (Sentry free tier, or Vercel's built-in log drains)
- At minimum, ensure all API route catch blocks log to `console.error` with enough context to diagnose in Vercel logs

---

## Pre-Launch Security Checklist

- [ ] `SESSION_SECRET` set in Vercel (strong random, not placeholder)
- [ ] `CRON_SECRET` set in Vercel and 401 enforced in route handler
- [ ] `DATABASE_URL` pointing at Neon with `?sslmode=require`
- [ ] `NEXT_PUBLIC_APP_URL` set to production HTTPS domain
- [ ] Security headers verified live (`curl -I https://yourdomain.com`)
- [ ] Resend configured — test email received end-to-end
- [ ] File uploads going to R2 — upload and download a document
- [ ] Stripe webhook signature verification confirmed in Vercel logs
- [ ] Cron endpoint returns 401 without correct bearer token
- [ ] robots.txt accessible at `https://yourdomain.com/robots.txt`

---

## Files to Modify

| File | Security change |
|---|---|
| `src/app/api/cron/auto-billing/route.ts` | Harden 401 enforcement — reject empty secret |
| `src/app/api/stripe/webhook/route.ts` | Wrap idempotency check in Prisma transaction |
| `src/app/api/docusign/webhook/route.ts` | Log errors instead of silently swallowing |
| `src/server/emails/send.ts` | Replace console stub with Resend client |
| `src/lib/record-payment.ts` | Wrap `sendEmail` in try-catch |
| `src/lib/statement-send.ts` | Wrap `sendEmail` in try-catch |
| `src/lib/files.ts` | Replace local fs with R2 |
| `src/lib/pdf.ts` | Write PDFs to R2 |
| `src/app/api/documents/[id]/route.ts` | Serve files via presigned R2 URLs |
| `vercel.json` | Add crons config |
| New: `src/lib/r2.ts` | R2 client wrapper |
