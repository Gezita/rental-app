# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

All mutations use **Server Actions** in `src/app/actions/`; there are no REST endpoints except for Stripe webhooks, the cron trigger, document downloads, and session management (`src/app/api/`). Pages are Server Components by default — add `"use client"` only for forms, flash-alert dismiss, or submit pending state.

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
| `src/lib/parse-bills-xlsx.ts` | Spreadsheet bill import (server-only — never import in client components) |
| `src/lib/record-payment.ts` | Payment recording, receipt generation, Stripe webhook handling |
| `src/lib/auto-billing.ts` | Scheduled auto-generate + email statements |
| `src/lib/overdue.ts` | Syncs overdue status (runs on dashboard/statements load) |
| `src/lib/payment-status.ts` | Derives UI payment status — use `PaymentStatusBadge` rather than replicating logic |
| `src/lib/billing-constants.ts` | Canonical `MONTH_NAMES`, utility labels, year options — do not duplicate |
| `src/lib/validation.ts` | All shared input validation |
| `src/lib/ownership.ts` | Authorization guards (`requireProperty`, `requireUnit`, etc.) |
| `src/lib/session-token.ts` | HMAC session signing (requires `SESSION_SECRET` in production) |
| `src/lib/pdf.ts` | PDF generation for statements, leases, and receipts (server-only) |
| `src/lib/ltb-forms.ts` | LTB form catalogue (codes, names, download URLs) |
| `src/lib/ltb-notice-wizard.ts` | Multi-step LTB notice wizard — field definitions and form-filling logic |
| `src/lib/standard-lease-2229e.ts` | Fills Ontario Form 2229e standard lease PDF from unit/lease data |

### Heavy dependencies

`xlsx` and `pdf-lib` are server-only. `xlsx` is dynamically imported to keep client bundles small. Never import either in a client component.

### Statement statuses

`draft` → `sent` → `partial` | `paid` | `overdue` | `cancelled`

Prior-balance rolls forward from `sent`, `overdue`, or `partial` — never from `draft` (tenant was never billed).

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

## Related docs

- `PRODUCT_ROADMAP.md` — product strategy and phased roadmap (features, mobile, monetization, UX)
- `LANDLORD_BILLING_APP_ARCHITECTURE_MVP.md` — product spec, data model, all business rules, implementation status
- `STYLE_GUIDE.md` — UI tokens, component catalogue, page patterns
- `production-plan.md` — phased plan for production hosting (database, file storage, email)
