# Landlord Billing & Document Management App — Architecture & Implementation Guide

> **Last updated:** June 2026 — reflects the current codebase, not the original planning doc alone.

## Implementation Status

| Area | Status | Notes |
|------|--------|-------|
| Auth (sign up / sign in) | ✅ Done | bcrypt passwords, HMAC session cookies |
| Properties, units, tenants | ✅ Done | Tenant creation also creates active lease |
| Utility rules | ✅ Done | Per-unit percentages, included-in-rent flag |
| Manual utility bills | ✅ Done | PDF upload, auto-split, upsert by month |
| Spreadsheet bill database | ✅ Done | Server-side xlsx parse; gas/water/electricity |
| Statement generation | ✅ Done | Draft-first; rent + utilities + prior balance |
| Statement send + PDF | ✅ Done | pdf-lib; email logged to console in dev |
| Partial payments + receipts | ✅ Done | Multiple payments per statement |
| Stripe online payments | ✅ Done | `/pay/[token]` checkout flow |
| Auto-billing cron | ✅ Done | Generate + email drafts on schedule |
| LTB notices | ✅ Done | Ontario N-series forms |
| Maintenance tracking | ✅ Done | Status, cost, invoice upload |
| PWA / offline shell | ✅ Done | manifest, service worker |
| Tenant portal | ❌ Not built | Tenants only get email + pay link |
| OCR bill reading | ❌ Not built | Manual entry + spreadsheet import |
| Multi-user teams | ❌ Not built | Single landlord per account |
| PostgreSQL / cloud storage | ⚠️ Dev only | SQLite + local `uploads/` folder |

---

## 1. Product Summary

The app helps small landlords manage rental units, tenant information, lease documents, utility bills, monthly tenant statements, receipts, and maintenance records.

**Core value proposition:**

> A landlord can set up properties and units, define rent and utility-split rules, import or upload utility bills, auto-generate monthly tenant statements, send them to tenants, record payments (including partial), generate receipts, and keep all documents organized by property and unit.

**Target users:** Small landlords with 1–20 units — duplexes, triplexes, basement apartments, and small portfolios where utilities are shared.

---

## 2. MVP Goals

### Delivered

1. Properties, units, tenants, and leases
2. Rent, due dates, and utility responsibility rules per unit
3. Utility bill upload and automatic split between units
4. Spreadsheet bill database for recurring monthly amounts
5. Monthly statement generation with prior-balance roll-forward
6. Document storage (leases, bills, statements, receipts, notices)
7. Maintenance expense and invoice tracking
8. Email statements and receipts (dev: console; prod: wire email provider)
9. Mark statements paid / record partial payments / generate receipts
10. Stripe card payments via pay link
11. Auto-send statements on configurable day of month
12. Lease end reminders on dashboard
13. LTB notice download, upload, and email

### Still Out of Scope

- Tenant self-service portal
- Tenant screening / credit checks
- Full accounting / tax filing
- E-signature leases
- AI/OCR bill reading
- Multi-user roles and permissions
- Advanced reporting / CRA exports
- Native mobile app (PWA only)

---

## 3. Tech Stack (As Built)

### Frontend

- **Next.js 15** App Router + **React 19** + **TypeScript**
- **Tailwind CSS 4** — custom tokens in `globals.css` (see `STYLE_GUIDE.md`)
- **Server Components** by default; client components for forms, flash alerts, submit pending state
- **lucide-react** icons with `optimizePackageImports`

### Backend

- **Next.js Server Actions** — all mutations in `src/app/actions/`
- **Prisma 6** ORM
- **SQLite** for local dev (`DATABASE_URL=file:./dev.db`)
- **Auth:** custom bcrypt + HMAC-signed cookies (`SESSION_SECRET`)
- **File storage:** local `uploads/` directory (`src/lib/files.ts`)
- **Email:** `src/lib/email.ts` — logs to console in development
- **PDF:** `pdf-lib` (`src/lib/pdf.ts`)
- **Spreadsheets:** `xlsx` — **server-only**, dynamically imported

### Recommended for Production

| Concern | Current (dev) | Production recommendation |
|---------|---------------|---------------------------|
| Database | SQLite | PostgreSQL |
| Files | Local disk | S3 / R2 / Supabase Storage |
| Email | Console | Resend, Postmark, or SendGrid |
| Hosting | localhost | Vercel, Railway, or VPS with HTTPS |
| Cron | Manual curl | Vercel Cron, GitHub Actions, or system cron |

---

## 4. Core App Modules

```text
App
├── Authentication          src/app/(auth)/, src/lib/auth.ts, src/middleware.ts
├── Dashboard               src/app/(dashboard)/dashboard/
├── Properties & Units      src/app/(dashboard)/properties/
├── Utility Bills           Per-property bills + global /utility-bills hub
├── Utility Rules           Per-unit rules at …/units/[unitId]/utilities
├── Monthly Statements      src/lib/statements.ts, src/app/(dashboard)/statements/
├── Payments & Receipts     src/lib/record-payment.ts, Stripe /api/stripe/
├── Documents               src/app/(dashboard)/documents/
├── Maintenance             src/app/(dashboard)/maintenance/
├── LTB Notices             src/app/(dashboard)/notices/, src/lib/ltb-forms.ts
├── Email                   src/lib/email.ts, src/lib/tenant-communications.ts
├── PDF Generation          src/lib/pdf.ts
├── Auto-billing            src/lib/auto-billing.ts, /api/cron/auto-billing
└── Settings                src/app/(dashboard)/settings/
```

---

## 5. User Roles

**MVP:** Single role — **Landlord / Owner**.

All data is scoped by `userId`. Authorization helpers in `src/lib/ownership.ts`:

- `requireProperty(userId, propertyId)`
- `requireUnit(userId, unitId)`
- `requireTenant(userId, tenantId)`
- `requireStatement(userId, statementId)`

**Future:** Admin, property manager, accountant (read-only), tenant portal user.

---

## 6. Information Architecture (Routes)

```text
/dashboard                    Portfolio summary, onboarding, alerts
/properties                   Property list
/properties/new               Create property
/properties/[id]              Property detail + units
/properties/[id]/units/new    Add unit
/properties/[id]/units/[unitId]           Unit detail (tenant, rent)
/properties/[id]/units/[unitId]/utilities Utility split rules
/properties/[id]/units/[unitId]/statements Unit statement history
/properties/[id]/utility-bills            Bill list
/properties/[id]/utility-bills/import     Spreadsheet + manual entry
/properties/[id]/utility-bills/new        Manual bill with PDF
/utility-bills                Cross-property bill hub
/statements                   All statements (filter by payment, unit)
/statements/generate          Generate current or past statements
/statements/[id]              Statement detail, send, pay, refresh
/notices                      LTB form download + upload + email
/documents                    All documents
/maintenance                  Maintenance records
/maintenance/receipts         Receipt repository
/profile                      Account profile
/settings                     Auto-send, Stripe, payment instructions
/pay/[payToken]               Tenant Stripe checkout (public)
/sign-in, /sign-up            Auth
```

Navigation config: `src/lib/navigation.ts`

---

## 7. Main User Flows

### 7.1 First-Time Setup

```text
Sign up → Create property → Add unit → Add tenant (+ lease created)
→ Set utility rules → Import bill amounts → Generate statements
```

Dashboard onboarding checklist tracks: property, tenant, utility rules, bills, statements.

### 7.2 Utility Bill Import (Spreadsheet)

```text
Property → Utility bills → Import
→ Choose utility type (gas/water/electricity)
→ Upload .xlsx (max 10 MB)
→ Server previews row count
→ Confirm replace (destructive for that utility's spreadsheet bills)
→ Bills saved with billMonth/billYear → splits calculated per unit rules
```

Supported formats: Enbridge gas exports, Alectra-style bill history, generic Month/Year/Amount tables. See `scripts/test-parse-bills.ts` and `public/samples/`.

### 7.3 Manual Utility Bill

```text
Property → Utility bills → New
→ Enter type, amount, billing period, optional PDF
→ Upserts on property + type + bill month (no duplicate key errors)
→ Splits recalculated
```

### 7.4 Generate Monthly Statements

```text
Statements → Generate → Select property, month, units
→ For each unit with active tenant:
    - Rent line item
    - Utility splits for matching bill month
    - Prior balance (sent/overdue/partial only — not drafts)
→ Draft statements created
→ Review → Send (email + PDF)
```

### 7.5 Payment and Receipt

```text
Open statement → Record payment (full or partial)
→ Payment capped at outstanding balance
→ Status: partial | paid
→ Receipt PDF generated on full payment
→ Optional receipt email
```

Stripe: tenant uses pay link in email → `checkout.session.completed` webhook records payment.

### 7.6 Maintenance

```text
Maintenance → New → Property, unit, category, cost, invoice upload
→ Appears in maintenance list and documents
```

---

## 8. Database Models

Schema: `prisma/schema.prisma`. Money is always **integer cents**.

### Key models

| Model | Purpose |
|-------|---------|
| `User` | Landlord account |
| `UserSettings` | Landlord name, payment instructions, auto-send, Stripe toggle, lease reminder days |
| `Property` | Rental property |
| `Unit` | Rentable unit within property |
| `Tenant` | Person assigned to unit (`isActive` flag) |
| `Lease` | Lease record (created with tenant; also from lease upload) |
| `UtilityRule` | Per-unit utility split (`@@unique([unitId, utilityType])`) |
| `UtilityBill` | Property-level bill (`source`: manual \| spreadsheet) |
| `UtilityBillSplit` | Calculated amount per unit per bill |
| `Statement` | Monthly tenant invoice |
| `StatementLineItem` | Rent, utility, previous_balance, etc. |
| `Payment` | Payment against statement |
| `Receipt` | Receipt after payment |
| `Document` | File metadata (local path in dev) |
| `MaintenanceRecord` | Repair/expense tracking |

### Important constraints

```prisma
@@unique([propertyId, utilityType, billMonth, billYear])  // UtilityBill
@@unique([unitId, statementMonth, statementYear])         // Statement
@@unique([unitId, utilityType])                          // UtilityRule
```

### Statement statuses

`draft` | `sent` | `partial` | `paid` | `overdue` | `cancelled`

---

## 9. Business Rules (Implemented)

### Statement vs Receipt

- **Statement** = request for payment (before or during payment).
- **Receipt** = proof of payment (after payment recorded).
- Never label an unpaid bill as a receipt.

### Prior balance roll-forward

Outstanding balance from the **prior month** rolls forward when prior statement status is:

- `sent`, `overdue`, or `partial`

Does **not** roll forward from `draft` (tenant was never sent that statement).

### Utility splits

```text
unitAmountCents = round(billAmountCents × percentage / 100)
```

- Splits are recalculated in a transaction; remainder pennies go to the largest split so totals match the bill.
- Percentages clamped to 0–100 on save.
- Units with `includedInRent` or `tenantPays: false` are skipped.

### Bill month matching

Statements for month M include bills where `billMonth = M` and `billYear = Y`, with legacy fallback on billing period overlap (`src/lib/utility-bill-month.ts`).

### Rent due date

`rentDueDay` (1–31) is clamped to the last day of short months (e.g. Feb 31 → Feb 28).

### Active tenant selection

When multiple active tenants exist (should not happen — creation is transactional), the oldest by `createdAt` is used.

### Spreadsheet import safety

- Preview on server before import
- User must confirm (`confirmed=true` in form data)
- Replaces only `source: spreadsheet` bills for the selected utility type
- 10 MB file size limit

---

## 10. Server Actions Reference

Exported from `src/app/actions/index.ts`:

| Module | Actions |
|--------|---------|
| `properties` | create/delete property, unit, tenant; utility rules; bills; xlsx import |
| `statements` | generate, send, record payment, refresh, delete, auto-billing |
| `settings` | profile, landlord settings |
| `documents` | upload document, lease |
| `communications` | LTB notice, announcement, maintenance receipt |
| `maintenance` | create maintenance record |
| `auth` | sign up, sign in, sign out |

---

## 11. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/documents/[documentId]` | GET | Download document (auth required) |
| `/api/stripe/checkout` | POST | Create checkout session |
| `/api/stripe/webhook` | POST | Stripe payment completion |
| `/api/cron/auto-billing` | POST | Monthly auto-generate + send (Bearer `CRON_SECRET`) |

All other mutations use Server Actions, not REST.

---

## 12. Key Library Modules

| File | Responsibility |
|------|----------------|
| `statements.ts` | Split calculation, generation, refresh, roll-forward |
| `parse-bills-xlsx.ts` | Spreadsheet parsing (server-only) |
| `utility-bill-month.ts` | Bill month assignment, statement month matching |
| `past-statements.ts` | Historical statement creation with initial payment |
| `record-payment.ts` | Payment recording, receipt generation |
| `auto-billing.ts` | Scheduled generate + email |
| `overdue.ts` | Sync overdue status on dashboard/statements views |
| `payment-status.ts` | UI payment status derivation |
| `validation.ts` | Shared input validation (dates, rent day, percentages) |
| `billing-constants.ts` | Month names, utility labels, year options |
| `money.ts` | `formatMoney`, `parseMoneyToCents`, reasonableness checks |
| `ownership.ts` | Authorization guards |
| `session-token.ts` | HMAC session signing (requires `SESSION_SECRET` in prod) |

---

## 13. Security

### Implemented

- Middleware protects dashboard routes (`src/middleware.ts`)
- All queries scoped by `userId` via ownership helpers
- Session cookies: `httpOnly`, `sameSite: lax`, `secure` in production
- Production refuses default `SESSION_SECRET`
- File upload type and size limits (`src/lib/files.ts`)
- Money stored as integer cents
- Spreadsheet import requires explicit confirmation
- Cron endpoint requires `CRON_SECRET` bearer token

### Production TODO

- Rate limiting on auth endpoints
- Stronger password policy
- Session expiry / invalidation on password change
- Signed URLs for document access (currently path-based with auth check)
- Real email provider with bounce handling
- Move secrets to hosting provider env (never commit `.env`)

---

## 14. Performance Notes

- `requireUser()` wrapped in `React.cache()` — one DB fetch per request
- `xlsx` never shipped to client (import page ~3 kB vs ~123 kB before server-side preview)
- `optimizePackageImports` for `lucide-react` and `date-fns`
- Dashboard `loading.tsx` skeleton for perceived performance
- Utility split writes use `createMany` inside transactions

### Known scaling limits

- Statements list loads all rows (pagination not yet implemented)
- `syncOverdueStatements` runs on dashboard/statements page load (consider cron-only)
- SQLite single-writer — switch to PostgreSQL for concurrent users

---

## 15. Testing & Development

```bash
npm run lint          # ESLint
npm run build         # Type check + production build
npx tsx scripts/test-parse-bills.ts   # Spreadsheet parser regression tests
```

**Clean build cache** if you see `MODULE_NOT_FOUND` webpack errors:

```bash
rm -rf .next && npm run dev
```

---

## 16. Build Phases (Historical → Current)

| Phase | Original plan | Current state |
|-------|---------------|---------------|
| 1 Foundation | Auth, property, unit, tenant | ✅ Complete |
| 2 Utility rules + documents | Rules, upload, storage | ✅ Complete |
| 3 Utility bills + splits | Upload, split calc | ✅ + spreadsheet import |
| 4 Statement generation | Drafts, PDF, line items | ✅ Complete |
| 5 Email, payment, receipt | Send, mark paid, receipt | ✅ + Stripe + partial |
| 6 Maintenance | CRUD, invoices | ✅ Complete |
| — Extras | — | Auto-billing, LTB notices, PWA, onboarding |

---

## 17. Future Work (Prioritized)

### High impact

1. **PostgreSQL** migration for production hosting
2. **Statements pagination** + DB-level payment filters
3. **Cloud file storage** (S3/R2)
4. **Real email provider** integration
5. **Split `statements.ts`** into smaller modules (splits, generation, roll-forward)

### Medium

6. Auth rate limiting and session expiry
7. Auto-billing timezone (America/Toronto) for Canadian landlords
8. `error.tsx` boundaries for friendly error pages
9. Batch prior-balance queries during multi-unit generation
10. Tenant portal (view statements, pay history)

### Low / V2

11. OCR for utility bill amounts
12. CRA/T776-ready reports
13. Multi-user team access
14. Capacitor native app wrapper
15. Green Button / utility API integration (removed from codebase; manual import remains)

---

## 18. MVP Success Metrics

**Primary activation:** User generates and sends their first monthly statement.

**Primary retention:** User returns next month and generates another statement.

Track: properties, units, bills imported, statements generated/sent, payments recorded, time-to-first-statement.

---

## 19. Development Priority (For New Contributors)

When adding features, follow existing patterns:

1. Schema change in `prisma/schema.prisma` → `npm run db:push`
2. Business logic in `src/lib/`
3. Server action in `src/app/actions/` with `requireUser` + ownership check
4. Page as Server Component in `src/app/(dashboard)/`
5. Client component only if interactivity required
6. Validation in `src/lib/validation.ts`
7. Update this doc and `README.md` when behavior changes

**Core workflow order** (still the right mental model):

```text
Property → Unit → Tenant → Utility rules → Bills → Statements → Send → Pay → Receipt
```

---

## 20. Related Documentation

- [`zigglo_ui_style_guide.md`](./zigglo_ui_style_guide.md) — Zigglo design language (primary UI reference)
- [`README.md`](./README.md) — setup, env vars, troubleshooting, workflows
- [`STYLE_GUIDE.md`](./STYLE_GUIDE.md) — Rentals UI tokens, components, page patterns
