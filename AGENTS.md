# AGENTS.md

Coding-agent instructions for the Rentals Dashboard. Read this alongside `CLAUDE.md` (project commands and architecture) and `STYLE_GUIDE.md` (UI tokens and component patterns).

---

## Project overview

A Next.js 15 landlord billing app for small Ontario rental portfolios. Landlords create properties, add tenants, import utility bills, and generate monthly statements. Tenants can pay via Stripe. The app is a single Next.js process — no separate backend service.

**Stack:** Next.js 15 App Router · React 19 · TypeScript · Prisma · PostgreSQL · Tailwind CSS 4 · pdf-lib · xlsx · Stripe · bcryptjs

---

## Local environment

**Requirements:** Node.js 20+ and Docker Desktop.

```bash
cp .env.example .env
make setup        # start Postgres, install deps, push schema, seed demo data
make dev          # start Postgres + dev server at http://localhost:3000
```

Demo account: `demo@landlord.app` / `demo1234`

If Node is missing: `make install-node` (installs fnm), then restart terminal and run `fnm install 20 && fnm default 20`.

---

## Build and validation

There are **no automated tests**. Validation is ESLint + the TypeScript build check:

```bash
npm run lint          # ESLint
npm run build         # type-check + production build (must pass before merging)
npx tsx scripts/test-parse-bills.ts   # spreadsheet parser regression (closest thing to a unit test)
```

Always run `npm run build` before marking a task complete. Fix all TypeScript errors and lint warnings.

---

## Key conventions

### Request flow

- **All mutations** → Server Actions in `src/app/actions/`
- **All pages** → Server Components by default; add `"use client"` only for forms, flash-alert dismiss, or submit pending state
- **No REST endpoints** except Stripe webhooks (`src/app/api/stripe/`), the cron trigger (`src/app/api/cron/`), and document downloads (`src/app/api/documents/`)

### Authorization — required on every action and page

Every server action and data-fetching page must call `requireUser()` then an ownership helper:

```ts
const user = await requireUser();
const property = await requireProperty(user.id, propertyId);
```

`requireUser()` is in `src/lib/auth.ts` (React.cache-wrapped).  
Ownership helpers are in `src/lib/ownership.ts`: `requireProperty`, `requireUnit`, `requireTenant`, `requireStatement`, `requireDocument`.

**Never skip these.** Missing auth checks are the most critical class of bug in this codebase.

### Money — integer cents everywhere

All monetary values are stored as **integer cents** in the database. Never use floats for money.

```ts
formatMoney(cents)         // src/lib/money.ts — for display
parseMoneyToCents(string)  // src/lib/money.ts — for input parsing
```

### Database

- Provider: **PostgreSQL** (Docker locally, Neon in production)
- ORM: **Prisma only** — no `$queryRaw`, `$executeRaw`, or raw SQL of any kind
- After schema changes: `npm run db:push` (dev) or `npm run db:migrate` (creates a migration file for production)
- Unique constraints that matter:
  - `UtilityBill`: `(propertyId, utilityType, billMonth, billYear)`
  - `Statement`: `(unitId, statementMonth, statementYear)`
  - `UtilityRule`: `(unitId, utilityType)`

### Server-only modules

`xlsx` and `pdf-lib` are server-only. Never import either in a client component or any file that could be bundled to the client. `xlsx` is dynamically imported in `src/lib/parse-bills-xlsx.ts`.

### UI

- **CSS tokens only** — use semantic tokens (`text-danger`, `bg-primary-muted`), never raw Tailwind color scales (`text-red-700`, `bg-blue-500`). See `STYLE_GUIDE.md` for the full token list.
- **Class composition** — use `cn()` from `src/lib/utils.ts`; never concatenate class strings manually.
- **Icons** — `lucide-react` only; import named icons, not the whole package.
- **Page patterns:**
  - List pages: `PageHeader` → optional `FlashAlert` → `Card` with table
  - Detail pages: `PageBackNav` → heading → sections in `Card`s
  - Flash feedback: redirect with `?error=…` or `?saved=1`, display with `FlashAlert`
  - Filters (status, unit) use URL search params, not client state

### Constants and utilities — do not duplicate

| File | What it owns |
|------|-------------|
| `src/lib/billing-constants.ts` | `MONTH_NAMES`, utility labels, year options |
| `src/lib/money.ts` | `formatMoney`, `parseMoneyToCents` |
| `src/lib/validation.ts` | All shared input validation |
| `src/lib/payment-status.ts` | Payment status derivation — use `PaymentStatusBadge`, don't replicate |

---

## Key library modules

| File | Responsibility |
|------|----------------|
| `src/lib/statements.ts` | Statement generation, utility split calculation, prior-balance roll-forward |
| `src/lib/parse-bills-xlsx.ts` | Spreadsheet bill import (server-only) |
| `src/lib/record-payment.ts` | Payment recording, receipt generation, Stripe webhook handling |
| `src/lib/auto-billing.ts` | Scheduled auto-generate + email statements |
| `src/lib/overdue.ts` | Syncs overdue status (runs on dashboard/statements load) |
| `src/lib/files.ts` | User file uploads (local filesystem in dev; will move to R2) |
| `src/lib/pdf.ts` | PDF generation for statements and receipts |
| `src/lib/email.ts` | Email sending (console logger in dev; will move to Resend) |
| `src/lib/session-token.ts` | HMAC session signing |

---

## Statement lifecycle

```
draft → sent → partial | paid | overdue | cancelled
```

Prior-balance rolls forward from `sent`, `overdue`, or `partial` — **never from `draft`** (the tenant was never billed for a draft).

---

## Adding a feature

1. Schema change → `npm run db:push`
2. Business logic → `src/lib/`
3. Server action → `src/app/actions/` with `requireUser` + ownership check
4. Page → `src/app/(dashboard)/` as Server Component
5. Client component only if interactivity is needed
6. Validation → `src/lib/validation.ts`

---

## Security considerations

- **Every server action must call `requireUser()` and an ownership helper** before touching the database. This scopes all queries by `userId` and redirects on unauthorized access.
- **Session tokens** are HMAC-signed cookies (`src/lib/session-token.ts`). `SESSION_SECRET` must be set to a strong random value in production — the app refuses to start without it.
- **Stripe webhooks** are verified against `STRIPE_WEBHOOK_SECRET` in `src/app/api/stripe/webhook/route.ts`. Never skip signature verification.
- **File uploads** are stored under `./uploads/{userId}/` — the `userId` scoping is intentional to prevent path traversal. Do not change this structure without understanding the implications.
- **No SQL injection risk** — all DB access is through Prisma's parameterized queries. Keep it that way; never introduce raw SQL.
- **Input validation** — all user-supplied data entering server actions must be validated via `src/lib/validation.ts`. Add shared validators there, not inline.

---

## Commit message guidelines

- Use the imperative mood: `add`, `fix`, `update`, `remove` — not `added` or `adding`
- Keep the subject line under 72 characters
- Reference what changed and why, not just what the code does
- Examples:
  - `fix: roll forward balance from overdue statements`
  - `feat: add lease end reminder to dashboard`
  - `chore: switch database provider to PostgreSQL`

## Pull request guidelines

- PRs must pass `npm run build` and `npm run lint` with no errors
- Include a short description of what changed and why
- For any change touching billing logic (`statements.ts`, `record-payment.ts`, `auto-billing.ts`), manually verify the happy path in the dev app before marking ready for review
- Do not introduce raw Tailwind color classes — use semantic tokens only
- Do not store or compute money as floats

---

## Environment variables

| Variable | Dev | Production |
|----------|-----|------------|
| `DATABASE_URL` | `postgresql://rental:rental@localhost:5432/rental_app` (Docker) | Neon connection string |
| `SESSION_SECRET` | auto-generated by `make setup` | Required — long random string |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Production domain |
| `STRIPE_SECRET_KEY` | optional | Required if Stripe is enabled |
| `STRIPE_WEBHOOK_SECRET` | optional | Required if Stripe is enabled |
| `CRON_SECRET` | optional | Bearer token for `/api/cron/auto-billing` |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `MODULE_NOT_FOUND` / webpack chunk errors | `rm -rf .next && npm run dev` |
| Prisma client out of sync after schema edit | `npm run db:generate` |
| Database schema out of sync | `npm run db:push` |
| Postgres container not running | `make db-up` |
| Postgres not ready yet | `make db-wait` |
| Native binding error (`@tailwindcss/oxide`) | `npm install @tailwindcss/oxide-linux-x64-gnu` (Linux/WSL) |
