# Lessora Product Roadmap

> **Last updated:** June 2026  
> Consolidated strategy, phased plan, and feature backlog from product planning sessions.

**Detailed docs:** [`docs/roadmap/`](./docs/roadmap/README.md) — split by topic with full phase checklists.

---

## Quick links

| Document | Contents |
|----------|----------|
| [docs/roadmap/README.md](./docs/roadmap/README.md) | Index and phase overview |
| [docs/roadmap/phases.md](./docs/roadmap/phases.md) | **Master phased roadmap** (Phase 0–4) |
| [docs/roadmap/marketing-and-tenant-portal.md](./docs/roadmap/marketing-and-tenant-portal.md) | **Marketing site, tenant portal, email, infra gaps** |
| [docs/roadmap/product-strategy.md](./docs/roadmap/product-strategy.md) | Positioning vs RentRedi, vision, success metrics |
| [docs/roadmap/implementation-status.md](./docs/roadmap/implementation-status.md) | Strategy mapped to current codebase |
| [docs/roadmap/mobile.md](./docs/roadmap/mobile.md) | Mobile web, PWA, API v1, Expo |
| [docs/roadmap/auth-and-monetization.md](./docs/roadmap/auth-and-monetization.md) | Google sign-in, unit subscription |
| [docs/roadmap/notifications.md](./docs/roadmap/notifications.md) | SMS/email reminders, CASL |
| [docs/roadmap/ux-and-animation.md](./docs/roadmap/ux-and-animation.md) | Dashboard, navigation, motion |

---

## Executive summary

**Goal:** Best **rental property workspace** for small landlords (1–50 units), especially Ontario — not a RentRedi/Buildium clone.

**Vision:** *Everything related to a rental property in one place.*

**Pitch:** RentRedi helps you collect rent. Lessora helps you **run** a small rental business — utility splits, monthly statements, documents in one place, Ontario landlord forms when you need them — with a **tenant portal** that stays in sync with the landlord workspace.

**Technical principle:** One backend (Next.js + Prisma + PostgreSQL), multiple clients (landlord web, tenant web, PWA, native via API). Business logic in `src/lib/*`. Landlord and tenant UIs share data but use **separate auth and authorization** — tenants never see privileged landlord data.

---

## New priorities (June 2026)

Three initiatives elevated for hosted cloud launch at [lessora.ca](https://lessora.ca):

### 1. Marketing intro page

Public product page (inspired by [TenantCloud](https://www.tenantcloud.com/)): hero, short intro, feature sections with **screenshots/illustrations**, About, Contact, Sign in, Get started. Replaces the bare redirect at `/` on cloud deploy.

**Detail:** [docs/roadmap/marketing-and-tenant-portal.md §1](./docs/roadmap/marketing-and-tenant-portal.md)

### 2. Tenant portal

Logged-in tenant experience aligned with the landlord app:

| Tenant can | Source on landlord side |
|------------|-------------------------|
| View & download statements | Same PDFs landlord sends |
| Pay rent (Stripe) | Integrated pay — not email-only |
| Read notices & announcements | Communications + LTB notices |
| Submit maintenance requests | Maintenance module |
| View shared documents | Tenant-scoped documents |

Tenants **cannot** access other units, utility bills, split rules, tax reports, settings, or landlord notes.

**Detail:** [docs/roadmap/marketing-and-tenant-portal.md §2](./docs/roadmap/marketing-and-tenant-portal.md)

### 3. Transactional email

All landlord→tenant email sends from **`noreply@lessora.ca`** via Resend. Plumbing exists; production needs API key + domain verification.

**Detail:** [docs/roadmap/marketing-and-tenant-portal.md §3](./docs/roadmap/marketing-and-tenant-portal.md)

---

## Email — do we have it set up?

| Piece | Status |
|-------|--------|
| `src/server/emails/send.ts` | ✅ Resend when `RESEND_API_KEY` set; console stub in dev |
| `src/lib/tenant-communications.ts` | ✅ Statement, receipt, announcement, notice content |
| `RESEND_FROM_EMAIL` | ✅ Documented as `noreply@lessora.ca` in `.env.example` |
| Production delivery | ⏳ Needs Resend account + `lessora.ca` domain verify |
| Error isolation on pay/send | ⏳ Email failure can roll back payment — fix before launch |

---

## Infrastructure gaps vs all-in-one competitors

See full table: [docs/roadmap/marketing-and-tenant-portal.md §4](./docs/roadmap/marketing-and-tenant-portal.md)

**Missing and high priority:** marketing landing page, tenant portal, live Resend email, outbound overdue reminders.

**Missing and medium priority:** SMS, SaaS subscription billing, in-app messaging, notification audit log.

**Intentionally deferred:** tenant screening, listing syndication, full accounting/GL, team roles, owner portal, native apps (Phase 4).

**Lessora differentiators to keep:** Ontario utility splits, LTB notices, T776 export, spreadsheet bill import.

---

## Phase overview

| Phase | Name | Timeline | Focus |
|-------|------|----------|-------|
| **0** | Production foundation | Weeks 1–4 | Neon, R2, Resend, marketing home MVP |
| **1** | Workspace speed | Weeks 4–10 | Search, doc hub, utility profiles, About/Contact |
| **2** | Differentiators | Weeks 10–18 | Property timeline, health cards, expenses |
| **3** | Growth & retention | Weeks 18–28 | Subscription, Google auth, SMS, **full tenant portal** |
| **4** | Platform expansion | Month 7+ | Native apps, OCR, integrations |

Full task checklists: [docs/roadmap/phases.md](./docs/roadmap/phases.md)

---

## Phase checklist (quick reference)

### Phase 0 — Production foundation
- [ ] Neon PostgreSQL
- [ ] Cloudflare R2
- [ ] Resend email (`noreply@lessora.ca` verified)
- [ ] Production secrets and cron
- [ ] Marketing home page at `/` (cloud deploy)

### Phase 1 — Workspace speed
- [x] Global search (⌘K)
- [x] Property document hub
- [x] Document tags
- [x] Utility profiles
- [ ] Dashboard action focus + mobile web polish (dashboard done; mobile pending)
- [ ] Animation A1–A3 (motion tokens + reduced-motion done)
- [ ] About + Contact pages

### Phase 2 — Differentiators
- [ ] Property timeline
- [ ] Property health cards
- [ ] Maintenance timeline
- [ ] Expense rollup (simple, not accounting)
- [ ] Statement templates + recurring charges
- [ ] Ontario toolkit marketing
- [ ] Inspection `scheduledFor` (for reminders)
- [ ] Animation A4–A5

### Phase 3 — Growth & retention
- [ ] Subscription ($1/unit × 1–10, $2/unit × 11+)
- [ ] Google sign-in
- [ ] SMS/email reminders (overdue → inspection → maintenance)
- [ ] **Tenant portal** — magic link auth, statements, pay, notices, announcements, maintenance
- [ ] Smart email reminders

### Phase 4 — Platform expansion
- [ ] `/api/v1` REST API + Bearer auth
- [ ] Expo native apps (iOS/Android)
- [ ] Apple Sign-In
- [ ] OCR / auto-categorize
- [ ] Demand-gated integrations

---

## Success metrics

| Job | Target |
|-----|--------|
| Find a lease | < 10 seconds |
| Upload a utility bill | < 30 seconds |
| Generate statements | < 1 minute |
| Find maintenance record | < 15 seconds |
| View property status | < 5 seconds |

---

## 90-day focus

1. **Production email** — Resend live with `noreply@lessora.ca`
2. **Marketing home** — intro page with screenshots + sign-up funnel
3. **Tenant portal MVP** — statements, pay, notices, announcements
4. Global search + property document hub (largely done)
5. Utility profiles + billing workflow polish
6. Phase 0 production deploy (Neon + R2 + Resend)

---

## Subscription pricing (hosted cloud)

| Units | Monthly (CAD) |
|-------|---------------|
| 10 | $10 |
| 11 | $22 |
| 15 | $30 |
| 25 | $50 |

$1/unit for units 1–10; $2/unit for each unit above 10. Local install stays **free**.

Details: [docs/roadmap/auth-and-monetization.md](./docs/roadmap/auth-and-monetization.md)

---

## Related technical docs

| Document | Purpose |
|----------|---------|
| [LANDLORD_BILLING_APP_ARCHITECTURE_MVP.md](./LANDLORD_BILLING_APP_ARCHITECTURE_MVP.md) | Architecture and implementation status |
| [production-plan.md](./production-plan.md) | Neon, R2, Resend migration |
| [STYLE_GUIDE.md](./STYLE_GUIDE.md) | UI tokens and components |
| [zigglo_ux_ui_qa_recommendations.md](./zigglo_ux_ui_qa_recommendations.md) | UX audit |
| [AGENTS.md](./AGENTS.md) / [CLAUDE.md](./CLAUDE.md) | Developer conventions |

---

*Update phase checkboxes in [docs/roadmap/phases.md](./docs/roadmap/phases.md) as work ships.*
