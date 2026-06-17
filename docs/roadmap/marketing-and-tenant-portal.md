# Marketing Site & Tenant Portal

Guidelines for the public marketing experience and the tenant-facing side of Lessora. Reference competitor: [TenantCloud](https://www.tenantcloud.com/) — all-in-one property management with separate landlord and tenant experiences.

**Parent:** [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md)

---

## 1. Public marketing site

### Goal

Attract new landlords with a **product intro page** at the root URL (`/`) on the hosted cloud deploy (`lessora.ca`). The page should explain what Lessora does, show the product visually, and funnel visitors to sign up, sign in, or learn more — similar in structure to TenantCloud's hero + feature sections + social proof + CTA.

### Current state

| Piece | Status |
|-------|--------|
| `/` on cloud deploy | Redirects to `/sign-in` or `/dashboard` — no marketing content |
| `/get-started` | Local-install instructions only (Vercel landing deploy) |
| `/about`, `/contact` | **Not built** |
| Brand assets | `public/brand/lessora-*` — logo, icon |
| Sign-in / sign-up | Built at `/sign-in`, `/sign-up` |

### Page structure (MVP)

| Section | Content |
|---------|---------|
| **Hero** | Headline, one-line pitch, primary CTA ("Get started" → `/sign-up`), secondary CTA ("Sign in") |
| **Product intro** | Short paragraph: Ontario-focused rental workspace — utility splits, monthly statements, documents, LTB forms |
| **Feature blocks** | 3–4 sections with **illustration or app screenshot** each: billing workflow, utility splits, document hub, Ontario notices |
| **How it works** | 3 steps: add property → import bills → send statements |
| **Trust / Ontario wedge** | Ontario landlord forms, T776 export, utility split accuracy |
| **Footer** | About, Contact, Sign in, Privacy (placeholder OK), © Lessora |

### Design notes

- Reuse `BrandLogo`, semantic tokens from `STYLE_GUIDE.md` — no raw Tailwind color scales
- Screenshots from the real dashboard (billing workflow, statement PDF, property detail)
- Illustrations optional for v1 — polished screenshots are enough
- Mobile-first; hero CTA visible without scroll on 375px
- `isLocalDataOnlyDeploy()` on Vercel without `ALLOW_CLOUD_DATA`: keep `/get-started` as the root experience (local install funnel). Marketing page is for **cloud SaaS** deploy at `lessora.ca`

### Routes to add

| Route | Purpose |
|-------|---------|
| `/` | Marketing home (cloud) or existing redirect (local-only deploy) |
| `/about` | Company story, Ontario focus, who we serve (1–50 unit landlords) |
| `/contact` | Contact form or `hello@lessora.ca` + support expectations |

### Phase placement

- **Phase 0.8** — Marketing home MVP (blocks paid acquisition)
- **Phase 1.16** — About + Contact pages, screenshot refresh

### Exit criteria

- New visitor understands the product in < 30 seconds
- Clear path to `/sign-up` and `/sign-in`
- Lighthouse mobile performance acceptable (no heavy animation libraries)

---

## 2. Tenant portal

### Goal

Give tenants a **logged-in workspace** aligned with the landlord app: view statements, pay rent, read notices and announcements, and submit maintenance requests — without access to landlord-privileged data (other tenants, property finances, utility bill sources, tax reports, settings, integrations).

### Current state

| Piece | Status |
|-------|--------|
| Tenant model | `Tenant` record linked to `Unit` — no login credentials |
| Pay link | `/pay/[payToken]` — single-statement Stripe checkout (unauthenticated) |
| Email to tenants | Statements, receipts, announcements, LTB notices (via Resend when configured) |
| Tenant portal routes | **None** |
| Maintenance requests | Landlord-side only — tenants cannot submit |

### Architecture principles

1. **Same backend** — Next.js + Prisma + PostgreSQL; business logic in `src/lib/*`
2. **Separate route group** — `src/app/(tenant)/` with its own layout (no landlord sidebar)
3. **Strict authorization** — every tenant query scoped by `tenantId` from session; never use landlord `requireUser()` helpers for tenant routes
4. **Data mirroring** — landlord sends statement → tenant sees same statement; landlord posts announcement → tenant inbox shows it
5. **No privilege leakage** — tenants never see: other units' data, utility bill PDFs at property level, split percentages, T776, Stripe keys, DocuSign config, landlord notes

### Auth model (recommended)

**Magic link** to `tenant.email` (no passwords to manage):

1. Landlord invites tenant or tenant requests link from `/tenant/sign-in`
2. Email contains time-limited signed token → `/api/tenant/auth/verify`
3. Session cookie scoped to `tenantId` + `unitId` (separate from landlord `SESSION_SECRET` namespace or distinct cookie name)
4. Rate-limit by email (reuse `LoginAttempt` pattern)

Alternative for v0: extend pay-token pattern to a **tenant access token** on the `Tenant` record — simpler but less secure for a full portal.

### Schema additions (Phase 3)

```prisma
// Illustrative — implement in migration
model TenantSession {
  id        String   @id @default(cuid())
  tenantId  String
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  tenant    Tenant   @relation(...)
}

model TenantAnnouncement {
  id          String   @id @default(cuid())
  tenantId    String   // or unitId for unit-wide
  subject     String
  body        String
  sentAt      DateTime
  readAt      DateTime?
  // Links to landlord-sent announcement log
}
```

Reuse existing `Statement`, `Document` (tenant-scoped), maintenance records where `tenantId` is set.

### Tenant routes (MVP)

| Route | Feature | Landlord source |
|-------|---------|-----------------|
| `/tenant` | Dashboard — balance due, recent activity | `statements`, `overdue` |
| `/tenant/statements` | List + download PDF | Same PDFs landlord sends |
| `/tenant/statements/[id]` | Detail + pay button | `payToken` / Stripe |
| `/tenant/notices` | LTB notices emailed to tenant | `Document` category notice |
| `/tenant/announcements` | Landlord announcements | `communications` actions |
| `/tenant/maintenance` | Submit + track requests | `maintenance` module |
| `/tenant/documents` | Lease, move-in docs shared with tenant | `Document` where `tenantId` matches |
| `/tenant/sign-in` | Magic link request | — |

### What tenants can do

- [ ] View all statements for their unit (current + history)
- [ ] Pay outstanding balance via Stripe (same flow as `/pay/[payToken]`)
- [ ] Download statement and receipt PDFs
- [ ] Read notices and announcements sent by landlord
- [ ] Submit maintenance requests (description, optional photo)
- [ ] View shared documents (lease, move-in package)

### What tenants cannot see

- Other tenants or units in the property
- Property-level utility bills or split rules
- Landlord dashboard, billing workflow, tax reports
- Integration settings, API keys, subscription billing
- Internal landlord notes on tenant or unit records
- Inspection checklists (unless explicitly shared later)

### Landlord ↔ tenant sync

| Landlord action | Tenant portal effect |
|-----------------|----------------------|
| Send statement | Appears in `/tenant/statements`; email with pay link |
| Record payment / Stripe webhook | Statement status updates; receipt available |
| Email LTB notice | Copy in `/tenant/notices` |
| Send announcement | Inbox item in `/tenant/announcements` |
| Share document with tenant | Visible in `/tenant/documents` |
| Create maintenance from tenant request | Status updates visible to tenant |

### Email from address

All outbound mail from the landlord app to tenants uses:

```
RESEND_FROM_EMAIL="noreply@lessora.ca"
```

- Set in `.env` / production secrets
- `src/server/emails/send.ts` reads `RESEND_FROM_EMAIL` (defaults to `noreply@yourdomain.com` if unset — **always set in production**)
- Landlord reply-to: optional `landlordEmail` in templates (`tenant-communications.ts`) so tenants can reply to the landlord directly while From stays `noreply@lessora.ca`
- Verify `lessora.ca` domain in Resend (SPF/DKIM) before production send

### Phase placement

Elevated from "minimal portal" to **core Phase 3 deliverable** — required for competitive parity with TenantCloud's tenant app.

| Task | Phase |
|------|-------|
| Tenant magic-link auth | 3.15 |
| Statement list + PDF download | 3.16 |
| Integrated pay (not just email link) | 3.19 (updated) |
| Notices + announcements inbox | 3.22 (new) |
| Maintenance submit | 3.17 |
| Shared documents | 3.18 |
| Tenant mobile-responsive layout | 3.23 (new) |

### Exit criteria

- Beta tenant logs in, sees statements matching landlord view
- Payment in portal updates landlord statement status
- Tenant cannot access another unit's data (authorization test)
- All tenant emails send from `noreply@lessora.ca` in staging

---

## 3. Email infrastructure

### Do we have email sending set up?

**Yes — partially.** The plumbing exists; production delivery requires Resend configuration.

| Component | Location | Status |
|-----------|----------|--------|
| Send function | `src/server/emails/send.ts` | Resend client when `RESEND_API_KEY` set; `console.log` stub in dev |
| HTML layout | `src/lib/email-templates.ts` | Lessora-branded templates |
| Content builders | `src/lib/tenant-communications.ts` | Statements, receipts, announcements, LTB notices, onboarding |
| Call sites | `statement-send.ts`, `record-payment.ts`, `communications.ts`, `properties.ts`, `statements.ts` | Wired |
| Env vars | `.env.example` | `RESEND_API_KEY`, `RESEND_FROM_EMAIL=noreply@lessora.ca` |
| Domain verification | Resend dashboard | **Pending** — required for production |
| Error isolation | Payment + statement send | Email failure can abort transaction — wrap in try/catch (see `production-plan.md`) |

### Production checklist

- [ ] Create Resend account; verify `lessora.ca` domain
- [ ] Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL=noreply@lessora.ca` in production
- [ ] Send test statement end-to-end in staging
- [ ] Wrap `sendEmail()` in try-catch in `record-payment.ts` and `statement-send.ts`
- [ ] Add `NotificationLog` table for delivery audit (Phase 3 notifications)

---

## 4. Infrastructure gaps vs competitors

Comparison baseline: [TenantCloud](https://www.tenantcloud.com/) and similar all-in-one platforms (Buildium, RentRedi, Avail).

### What Lessora has today

| Capability | Status |
|------------|--------|
| Landlord auth (email/password) | ✅ |
| Google sign-in | 🔄 In progress (uncommitted) |
| Properties, units, tenants, leases | ✅ |
| Utility splits + spreadsheet import | ✅ (differentiator) |
| Monthly statements + prior balance | ✅ |
| Stripe pay links | ✅ |
| Auto-billing cron | ✅ |
| LTB notices (Ontario) | ✅ (differentiator) |
| T776 tax export | ✅ (differentiator) |
| DocuSign lease signing | ✅ (optional) |
| Maintenance tracking (landlord) | ✅ |
| Document storage (R2/local) | ✅ |
| PWA / offline shell | ✅ |
| Resend email plumbing | ✅ (needs API key) |

### What is missing (infrastructure & product)

| Gap | Competitors have it | Lessora priority | Phase |
|-----|---------------------|------------------|-------|
| **Marketing landing page** | Product intro, screenshots, pricing | **High** — acquisition | 0–1 |
| **Tenant portal** | Full tenant app | **High** — retention & parity | 3 |
| **Production email delivery** | Transactional email at scale | **High** — blocking | 0 |
| **SMS reminders** | Twilio overdue/lease alerts | Medium | 3 |
| **Outbound notification cron** | Automated overdue reminders | Medium | 3 |
| **SaaS subscription billing** | Per-unit pricing | Medium | 3 |
| **Team / multi-user** | Property manager roles | Low (defer) | 4+ |
| **Tenant screening** | Credit/background checks | Low (not Ontario wedge) | — |
| **Listing syndication** | Apartments.com, etc. | Low (defer) | — |
| **Full accounting / GL** | Bank reconciliation, P&L | Low (intentionally avoided) | — |
| **In-app messaging** | Landlord ↔ tenant chat | Medium | 3–4 |
| **Native mobile apps** | iOS/Android | Medium | 4 |
| **REST API `/api/v1`** | Mobile + integrations | Medium | 4 |
| **Push notifications** | Mobile alerts | Low | 4 |
| **Owner portal** | Investor view | Low (defer) | — |
| **Service pro portal** | Contractor work orders | Low (defer) | — |
| **AI assistant** | TenantCloud AI | Low (defer) | — |
| **Insurance / investing** | Marketplace add-ons | Low (defer) | — |
| **Notification audit log** | Delivery tracking | Medium | 3 |
| **CASL / SMS opt-in** | Canadian compliance | Medium | 3 |

### Strategic positioning

Lessora should **not** chase TenantCloud's full breadth. Double down on:

1. **Ontario rental operations** — utility splits, LTB notices, T776, standard lease
2. **Landlord + tenant linked experience** — portal mirrors landlord data, no sync drift
3. **Simple workspace** — not accounting software; export-friendly summaries

Add marketing site + tenant portal + reliable email to close the biggest gaps for a credible hosted product launch.

---

## 5. Updated 90-day focus

When marketing and tenant experience are priorities, reorder:

1. **Phase 0** — Resend live (`noreply@lessora.ca`), Neon + R2 production
2. **Marketing home** — `/` intro page with screenshots + sign-up funnel
3. **Tenant portal MVP** — magic link auth, statements, pay, notices
4. Utility profiles + billing workflow polish (existing)
5. Property timeline MVP (differentiator)

---

*Update checkboxes in [phases.md](./phases.md) as tasks ship.*
