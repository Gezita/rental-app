# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## App

**Lessora** — a landlord billing and property management app for small Ontario rental portfolios.

## Local development

**Requirements:** Node.js 20+ (see `.nvmrc`) and Docker Desktop.

The database is **PostgreSQL** running in Docker. Start it before the app:

```bash
make setup    # first-time: starts Postgres, installs deps, pushes schema, seeds demo data
make dev      # subsequent runs: starts Postgres + dev server
```

Run `make help` for all available targets.

## Commands

```bash
npm run dev              # Start development server (http://localhost:3000)
npm run build            # Type-check + production build
npm run lint             # ESLint

npm run db:push          # Push Prisma schema changes to the database (no migration file)
npm run db:migrate       # Create a migration file + apply it (use before production deploys)
npm run db:seed          # Seed demo data (demo@landlord.app / demo1234)
npm run db:setup         # db:push + db:seed (full reset)
npm run db:generate      # Regenerate Prisma client after schema edit

npx tsx scripts/test-parse-bills.ts   # Spreadsheet parser regression tests

rm -rf .next && npm run dev  # Fix MODULE_NOT_FOUND / webpack chunk errors
```

There are no automated tests beyond ESLint and the build type-check. The spreadsheet parser script is the closest thing to a unit test.

## Architecture

**Next.js 15 App Router + React 19 + TypeScript + Prisma + PostgreSQL**

### Request flow

All mutations use **Server Actions** in `src/app/actions/`; there are no REST endpoints except for Stripe webhooks, the cron trigger, DocuSign callbacks, document downloads, and session management (`src/app/api/`). Pages are Server Components by default — add `"use client"` only for forms, flash-alert dismiss, or submit pending state.

### Authorization pattern

Every server action and page must call `requireUser()` (from `src/lib/auth.ts`, React.cache-wrapped) then an ownership helper from `src/lib/ownership.ts`:

```ts
const user = await requireUser();
const property = await requireProperty(user.id, propertyId);
```

This scopes every DB query by `userId` and throws a redirect on unauthorized access.

### Money

All monetary values are stored as **integer cents** in the database. Use `formatMoney()` from `src/lib/money.ts` for display and `parseMoneyToCents()` for input parsing. Never store or compute with floats.

### Key library modules

| File | Responsibility |
|------|----------------|
| `src/lib/statements.ts` | Statement generation, utility split calculation, prior-balance roll-forward, refresh |
| `src/lib/statement-extras.ts` | Extra cost line items (one-off charges) on statements |
| `src/lib/statement-preview.ts` | Pre-send statement preview data |
| `src/lib/statement-send.ts` | Statement sending (email + PDF attach) |
| `src/lib/statement-stats.ts` | Aggregate statement statistics for dashboard |
| `src/lib/parse-bills-xlsx.ts` | Spreadsheet bill import (server-only — never import in client components) |
| `src/lib/record-payment.ts` | Payment recording, receipt generation, Stripe webhook handling |
| `src/lib/auto-billing.ts` | Scheduled auto-generate + email statements |
| `src/lib/billing-workflow.ts` | Monthly billing workflow step logic |
| `src/lib/overdue.ts` | Syncs overdue status (runs on dashboard/statements load) |
| `src/lib/payment-status.ts` | Derives UI payment status — use `PaymentStatusBadge` rather than replicating logic |
| `src/lib/billing-constants.ts` | Canonical `MONTH_NAMES`, utility labels, year options — do not duplicate |
| `src/lib/utility-profiles.ts` | Reusable utility split rule profiles (save/apply to units) |
| `src/lib/utility-split-preview.ts` | Preview utility splits before saving |
| `src/lib/utility-split-validation.ts` | Validation for utility split inputs |
| `src/lib/utility-bill-month.ts` | Utility bill month helpers |
| `src/lib/t776-report.ts` | T776 rental income tax report data aggregation |
| `src/lib/export-t776.ts` | T776 PDF form-fill export |
| `src/lib/fill-t776-form.ts` | Low-level T776 PDF field filling |
| `src/lib/validation.ts` | All shared input validation |
| `src/lib/ownership.ts` | Authorization guards (`requireProperty`, `requireUnit`, etc.) |
| `src/lib/session-token.ts` | HMAC session signing (requires `SESSION_SECRET` in production) |
| `src/lib/rate-limit.ts` | Login attempt rate limiting (DB-backed) |
| `src/lib/pdf.ts` | PDF generation for statements, leases, and receipts (server-only) |
| `src/lib/storage.ts` | Unified file storage — local `./uploads` in dev, Cloudflare R2 in production |
| `src/lib/r2.ts` | Cloudflare R2 S3-compatible client (used by `storage.ts`) |
| `src/lib/files.ts` | Thin wrapper re-exporting `storage.ts` helpers — prefer importing from `storage.ts` directly |
| `src/lib/email-templates.ts` | Reusable HTML email layout builder (Lessora-branded) |
| `src/lib/tenant-communications.ts` | Statement, receipt, and announcement email content builders |
| `src/lib/ltb-forms.ts` | LTB form catalogue (codes, names, download URLs) |
| `src/lib/ltb-notice-wizard.ts` | Multi-step LTB notice wizard — field definitions and form-filling logic |
| `src/lib/standard-lease-2229e.ts` | Fills Ontario Form 2229e standard lease PDF from unit/lease data |
| `src/lib/lease-wizard.ts` | Multi-step lease creation wizard logic |
| `src/lib/docusign.ts` | DocuSign envelope creation for lease e-signing |
| `src/lib/inspection-checklist.ts` | Default inspection checklist items and status labels |
| `src/lib/lease-reminders.ts` | Leases ending soon — data fetch for dashboard alerts |
| `src/lib/dashboard-hero-stats.ts` | Dashboard hero stat aggregation |
| `src/lib/portfolio-stats.ts` | Portfolio-level statistics |
| `src/lib/past-statements.ts` | Lookup of past statement records |
| `src/lib/navigation.ts` | `dashboardNavItems` — single source of truth for nav structure |
| `src/lib/section-tabs.ts` | Tab definitions for tabbed sections (billing, documents, settings) |
| `src/lib/document-constants.ts` | Document category labels and constants |
| `src/lib/deploy-config.ts` | Deploy mode helpers (`isLocalDataOnlyDeploy`) |
| `src/lib/cloud-guard.ts` | Blocks data mutations on the hosted landing deploy |
| `src/lib/search.ts` (actions) | Global search across properties, units, tenants |

### Heavy dependencies

`xlsx` and `pdf-lib` are server-only. `xlsx` is dynamically imported to keep client bundles small. Never import either in a client component.

### Statement statuses

`draft` → `sent` → `partial` | `paid` | `overdue` | `cancelled`

Prior-balance rolls forward from `sent`, `overdue`, or `partial` — never from `draft` (tenant was never billed).

### File storage

`src/lib/storage.ts` is the unified entry point. In dev it writes to `./uploads/{userId}/`. In production (when `R2_*` env vars are set) it uses Cloudflare R2 instead. Never access the filesystem directly for user files — always go through `storage.ts`.

### Email

Email is sent via **Resend** when `RESEND_API_KEY` is set; falls back to `console.log` in dev. Templates live in `src/lib/email-templates.ts` (layout builder) and content builders in `src/lib/tenant-communications.ts`.

### Hosted landing deploy

When deployed to Vercel without `ALLOW_CLOUD_DATA=1`, `isLocalDataOnlyDeploy()` returns `true` and `cloud-guard.ts` blocks all data mutations, redirecting to `/get-started`. This is the public marketing/onboarding page — no user data is stored there.

### Database schema notes

Unique constraints to know:
- `UtilityBill`: `(propertyId, utilityType, billMonth, billYear)` — manual bill upserts use this
- `Statement`: `(unitId, statementMonth, statementYear)` — one statement per unit per month
- `UtilityRule`: `(unitId, utilityType)` — one split rule per utility type per unit

### Adding a feature

1. Schema change → `npm run db:push`
2. Business logic → `src/lib/`
3. Server action → `src/app/actions/` with `requireUser` + ownership check
4. Page as Server Component → `src/app/(dashboard)/`
5. Client component only if interactivity is needed
6. Validation → `src/lib/validation.ts`

## UI conventions

See `STYLE_GUIDE.md` for the full reference. Key rules:

- Use semantic CSS tokens (`text-danger`, `bg-primary-muted`), never raw Tailwind color scales (`text-red-700`).
- Use `cn()` from `src/lib/utils.ts` for conditional class composition.
- List pages: `PageHeader` → optional `FlashAlert` → `Card` with table/list.
- Detail pages: `PageBackNav` → heading → sections in `Card`s.
- Flash feedback: redirect with `?error=…` or `?saved=1`; display with `FlashAlert`.
- Filters (payment status, unit) use URL search params, not client state.
- Icons: `lucide-react` only — import named icons, not the whole package.

## Environment variables

Copy `.env.example` to `.env` (or run `make setup` — it does this automatically and generates a random `SESSION_SECRET`).

| Variable | Dev value | Notes |
|----------|-----------|-------|
| `DATABASE_URL` | `postgresql://rental:rental@localhost:5432/rental_app` | Docker Postgres. Use Neon connection string in production. |
| `SESSION_SECRET` | auto-generated by `make setup` | Required in production — app throws at startup without it |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Required for Stripe redirects and tenant pay links |
| `STRIPE_SECRET_KEY` | optional | Enable Stripe payments in Settings after adding |
| `STRIPE_WEBHOOK_SECRET` | optional | Required if using Stripe |
| `CRON_SECRET` | optional | Bearer token for `/api/cron/auto-billing` |
| `RESEND_API_KEY` | optional | Enable email sending in production (console.log fallback in dev) |
| `RESEND_FROM_EMAIL` | optional | From address for outbound emails |
| `R2_ACCOUNT_ID` | optional | Cloudflare R2 — falls back to local `./uploads` if unset |
| `R2_ACCESS_KEY_ID` | optional | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | optional | Cloudflare R2 |
| `R2_BUCKET_NAME` | optional | Cloudflare R2 |
| `DOCUSIGN_INTEGRATION_KEY` | optional | DocuSign e-signing — configure under Integrations |
| `DOCUSIGN_ACCOUNT_ID` | optional | DocuSign |
| `DOCUSIGN_USER_ID` | optional | DocuSign |
| `DOCUSIGN_PRIVATE_KEY` | optional | DocuSign RSA private key |
| `LOCAL_DATA_ONLY` | unset locally | Set to `1` to simulate the hosted landing deploy |
| `ALLOW_CLOUD_DATA` | unset locally | Set to `1` on Vercel to opt into cloud persistence |

## Related docs

- `PRODUCT_ROADMAP.md` — product strategy and phased roadmap (features, mobile, monetization, UX)
- `LANDLORD_BILLING_APP_ARCHITECTURE_MVP.md` — product spec, data model, all business rules, implementation status
- `STYLE_GUIDE.md` — UI tokens, component catalogue, page patterns
- `production-plan.md` — phased plan for production hosting (database, file storage, email)
