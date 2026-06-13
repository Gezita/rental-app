# AGENTS.md

Coding-agent instructions for Lessora. Read this alongside `CLAUDE.md` (project commands and architecture) and `STYLE_GUIDE.md` (UI tokens and component patterns).

---

## Project overview

**Lessora** is a Next.js 15 landlord billing and property management app for small Ontario rental portfolios. Landlords create properties, add tenants, import utility bills, generate monthly statements, manage leases, track inspections, and file T776 tax reports. Tenants can pay via Stripe. The app is a single Next.js process — no separate backend service.

**Stack:** Next.js 15 App Router · React 19 · TypeScript · Prisma · PostgreSQL · Tailwind CSS 4 · pdf-lib · xlsx · Stripe · Resend · Cloudflare R2 · DocuSign · bcryptjs

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

## App structure

### Dashboard routes (`src/app/(dashboard)/`)

| Route | Feature |
|-------|---------|
| `/dashboard` | Home — hero stats, lease reminders, overdue alerts |
| `/properties` | Property list; unit list per property |
| `/properties/[id]` | Property detail — units, utility bills, finances |
| `/properties/[id]/units/[unitId]` | Unit detail — tenant, lease, utilities, statements |
| `/properties/[id]/units/[unitId]/lease/wizard` | Multi-step lease creation wizard |
| `/properties/[id]/units/[unitId]/lease/standard-lease` | Ontario Form 2229e PDF fill |
| `/properties/[id]/units/[unitId]/lease/complete` | Lease signing completion |
| `/tenants` | All tenants across the portfolio |
| `/billing` | Monthly billing workflow (step-by-step) |
| `/billing/statements` | All statements with payment-status and unit filters |
| `/billing/utility-bills` | Utility bill list and import |
| `/billing/payments` | Payment history |
| `/billing/tax-reports` | T776 rental income tax report |
| `/documents` | Document library (all files) |
| `/documents/notices` | LTB notices — fill, generate PDF, send to tenant |
| `/inspections` | Property inspections list |
| `/inspections/new` | Create new inspection |
| `/inspections/[id]` | Inspection detail and checklist |
| `/maintenance` | Maintenance request tracking |
| `/settings` | Account settings |
| `/settings/profile` | Landlord profile (name, contact shown on emails/PDFs) |
| `/settings/integrations` | Stripe, DocuSign, Resend configuration |

### API routes (`src/app/api/`)

| Route | Purpose |
|-------|---------|
| `/api/auth/` | Session sign-in / sign-out |
| `/api/cron/auto-billing` | Scheduled statement auto-generate + send (Bearer auth) |
| `/api/documents/[id]` | Secure document download (streams from local or R2) |
| `/api/stripe/webhook` | Stripe payment webhook (signature-verified) |
| `/api/docusign/callback` | DocuSign envelope status callback |
| `/api/reports/` | Server-side report generation |
| `/api/t776/` | T776 PDF export endpoint |

### Server actions (`src/app/actions/`)

All mutations go through server actions. Key action files:

| File | Actions |
|------|---------|
| `properties.ts` | CRUD for properties, units, utility rules, utility bills, utility profiles |
| `statements.ts` | Generate, send, refresh, delete, record payment, mark paid statements |
| `documents.ts` | Upload, delete documents and lease PDFs |
| `leases.ts` | Generate lease PDF, fill Form 2229e |
| `lease-signing.ts` | Save lease draft, send for DocuSign signature, mark signed |
| `communications.ts` | LTB notice upload/generate/email, tenant announcements, maintenance receipts |
| `inspections.ts` | Create, save, upload photo, delete inspections |
| `tax.ts` | Export T776 report |
| `settings.ts` | Update account and profile settings |
| `integrations.ts` | Save Stripe/DocuSign/Resend credentials |
| `maintenance.ts` | Create maintenance requests |
| `auth.ts` | Sign up, sign in, sign out |
| `search.ts` | Global search across properties, units, tenants |

---

## Key conventions

### Request flow

- **All mutations** → Server Actions in `src/app/actions/`
- **All pages** → Server Components by default; add `"use client"` only for forms, flash-alert dismiss, or submit pending state
- **No REST endpoints** except Stripe webhooks, DocuSign callback, cron trigger, and document downloads

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

### File storage

All file I/O goes through `src/lib/storage.ts`. In dev it writes to `./uploads/{userId}/`. In production (when `R2_*` env vars are set) it uses Cloudflare R2. Never read/write user files directly — always use `storage.ts`.

### Email

Send email via `src/lib/tenant-communications.ts` content builders + the Resend client in `src/lib/email.ts` (or the auto-billing mailer). `src/lib/email-templates.ts` provides the shared HTML layout. Falls back to `console.log` in dev when `RESEND_API_KEY` is unset.

### Server-only modules

`xlsx`, `pdf-lib`, `storage.ts`, `r2.ts`, and `email-templates.ts` are server-only. Never import them in a client component or any file that could be bundled to the client. `xlsx` is dynamically imported in `src/lib/parse-bills-xlsx.ts`.

### Hosted landing deploy

`src/lib/deploy-config.ts` exports `isLocalDataOnlyDeploy()`. When `true` (Vercel without `ALLOW_CLOUD_DATA`), `src/lib/cloud-guard.ts` blocks mutations and redirects to `/get-started`. The `/get-started`, `/sign-in`, `/sign-up`, `/offline`, and `/brand/*` paths are always accessible.

### UI

- **CSS tokens only** — use semantic tokens (`text-danger`, `bg-primary-muted`), never raw Tailwind color scales. See `STYLE_GUIDE.md`.
- **Class composition** — use `cn()` from `src/lib/utils.ts`; never concatenate class strings manually.
- **Icons** — `lucide-react` only; import named icons, not the whole package.
- **Navigation** — `src/lib/navigation.ts` is the single source of truth for nav structure; `src/lib/section-tabs.ts` owns tab definitions.
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
| `src/lib/navigation.ts` | Dashboard nav items |
| `src/lib/section-tabs.ts` | Billing, documents, settings tab arrays |
| `src/lib/document-constants.ts` | Document category labels |

---

## Key library modules

| File | Responsibility |
|------|----------------|
| `src/lib/statements.ts` | Statement generation, utility split calculation, prior-balance roll-forward |
| `src/lib/statement-extras.ts` | Extra one-off charge line items on statements |
| `src/lib/statement-preview.ts` | Pre-send preview data |
| `src/lib/statement-send.ts` | Sends statement email with PDF attachment |
| `src/lib/statement-stats.ts` | Aggregate stats for dashboard |
| `src/lib/billing-workflow.ts` | Monthly billing workflow step computation |
| `src/lib/parse-bills-xlsx.ts` | Spreadsheet bill import (server-only) |
| `src/lib/record-payment.ts` | Payment recording, receipt generation, Stripe webhook handling |
| `src/lib/auto-billing.ts` | Scheduled auto-generate + email statements |
| `src/lib/overdue.ts` | Syncs overdue status (runs on dashboard/statements load) |
| `src/lib/utility-profiles.ts` | Saved utility split rule profiles |
| `src/lib/utility-split-preview.ts` | Preview splits before saving |
| `src/lib/utility-split-validation.ts` | Utility split input validation |
| `src/lib/t776-report.ts` | T776 tax report data aggregation |
| `src/lib/export-t776.ts` | T776 PDF export |
| `src/lib/fill-t776-form.ts` | T776 PDF field filling (low-level) |
| `src/lib/storage.ts` | Unified file storage (local + R2) |
| `src/lib/r2.ts` | Cloudflare R2 S3 client |
| `src/lib/email-templates.ts` | Branded HTML email layout builder |
| `src/lib/tenant-communications.ts` | Statement, receipt, announcement email content |
| `src/lib/pdf.ts` | PDF generation for statements and receipts |
| `src/lib/ltb-forms.ts` | LTB form catalogue |
| `src/lib/ltb-notice-wizard.ts` | LTB notice wizard — field definitions and form-filling |
| `src/lib/standard-lease-2229e.ts` | Ontario Form 2229e PDF fill |
| `src/lib/lease-wizard.ts` | Multi-step lease creation wizard logic |
| `src/lib/docusign.ts` | DocuSign envelope creation for e-signing |
| `src/lib/inspection-checklist.ts` | Default checklist items and status labels |
| `src/lib/lease-reminders.ts` | Leases ending soon |
| `src/lib/rate-limit.ts` | DB-backed login attempt rate limiting |
| `src/lib/deploy-config.ts` | Deploy mode detection |
| `src/lib/cloud-guard.ts` | Blocks data access on hosted landing deploy |
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

- **Every server action must call `requireUser()` and an ownership helper** before touching the database.
- **Session tokens** are HMAC-signed cookies (`src/lib/session-token.ts`). `SESSION_SECRET` must be set in production.
- **Rate limiting** — login failures are tracked in the `LoginAttempt` table via `src/lib/rate-limit.ts`. 5 failures locks the key for 15 minutes.
- **Stripe webhooks** are verified against `STRIPE_WEBHOOK_SECRET`. Never skip signature verification.
- **File uploads** — validated by MIME type (declared + magic bytes via `file-type`) and capped at 10 MB. Stored under `./uploads/{userId}/` scoped by user ID to prevent path traversal. Do not change this structure.
- **No SQL injection risk** — all DB access is through Prisma's parameterized queries. Keep it that way.
- **Input validation** — all user-supplied data entering server actions must be validated via `src/lib/validation.ts`.

---

## Commit message guidelines

- Use the imperative mood: `add`, `fix`, `update`, `remove`
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
| `DATABASE_URL` | `postgresql://rental:rental@localhost:5432/rental_app` | Neon connection string |
| `SESSION_SECRET` | auto-generated by `make setup` | Required — long random string |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Production domain |
| `STRIPE_SECRET_KEY` | optional | Required if Stripe is enabled |
| `STRIPE_WEBHOOK_SECRET` | optional | Required if Stripe is enabled |
| `CRON_SECRET` | optional | Bearer token for `/api/cron/auto-billing` |
| `RESEND_API_KEY` | optional | Required for email in production |
| `RESEND_FROM_EMAIL` | optional | From address for outbound email |
| `R2_ACCOUNT_ID` | optional | Required for R2 file storage in production |
| `R2_ACCESS_KEY_ID` | optional | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | optional | Cloudflare R2 |
| `R2_BUCKET_NAME` | optional | Cloudflare R2 |
| `DOCUSIGN_INTEGRATION_KEY` | optional | DocuSign e-signing |
| `DOCUSIGN_ACCOUNT_ID` | optional | DocuSign |
| `DOCUSIGN_USER_ID` | optional | DocuSign |
| `DOCUSIGN_PRIVATE_KEY` | optional | DocuSign RSA private key |
| `LOCAL_DATA_ONLY` | unset | Force landing-only mode (auto-set by Vercel) |
| `ALLOW_CLOUD_DATA` | unset | Opt into cloud persistence on Vercel |

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
