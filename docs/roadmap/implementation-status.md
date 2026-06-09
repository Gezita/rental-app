# Implementation Status

Maps the product strategy to the **current codebase** (as of June 2026). Use this to decide what is polish vs net-new work.

For technical module locations, see [LANDLORD_BILLING_APP_ARCHITECTURE_MVP.md](../../LANDLORD_BILLING_APP_ARCHITECTURE_MVP.md).

---

## Summary table

| Strategy item | Doc priority | Status | Gap |
|---------------|--------------|--------|-----|
| Document vault | P1 | ~70% | Tags UI, global search, auto-categorize, property-folder hub |
| Monthly statements | P1 | ~90% | PDF template polish, recurring non-rent charges |
| Utility splits | P1 (signature) | ~80% | Utility profiles (presets), split preview polish |
| Maintenance center | P1 | ~75% | Timeline view, photos beyond invoice |
| Properties / units / tenants | P1 | Done | — |
| Inspections | — | Done | Scheduling for future SMS reminders |
| Property health dashboard | P2 | ~40% | Per-property score, occupancy roll-up |
| Expense tracking | P2 | ~50% | Yearly rollup UI; maintenance + property finances + T776 exist |
| Tenant portal | P2 | ~15% | Pay link only; no self-service portal |
| Property timeline | P2 | 0% | High-value differentiator — not started |
| OCR / AI | P3 | 0% | Correct to defer |
| Smart reminders | P3 | ~25% | Dashboard lease reminders; overdue sync; no outbound SMS/email cron |
| Ontario toolkit | P3 | ~60% | LTB notices wizard; expand N-series library |
| Online rent payments | "Avoid" in strategy | **Built** | Stripe checkout; de-emphasize in marketing |
| PWA / offline shell | — | Done | manifest, service worker |
| Auth (email/password) | — | Done | No Google OAuth yet |
| Auto-billing cron | — | Done | Generate + email statements on schedule |
| PostgreSQL / cloud storage | — | In progress | See [production-plan.md](../../production-plan.md) |
| Native mobile app | — | 0% | PWA only; responsive partial |
| Landlord subscription | — | 0% | No Stripe Billing for SaaS |
| SMS notifications | — | 0% | `Tenant.phone` exists; no Twilio |

---

## Delivered (Phase 1 equivalent — largely done)

- [x] Auth (sign up / sign in) — bcrypt, HMAC session cookies
- [x] Properties, units, tenants, leases
- [x] Utility rules per unit (percentages, included-in-rent)
- [x] Manual utility bills + spreadsheet import (xlsx)
- [x] Statement generation (draft-first, prior balance roll-forward)
- [x] Statement send + PDF (pdf-lib)
- [x] Partial payments + receipts
- [x] Stripe tenant pay links (`/pay/[token]`)
- [x] Auto-billing cron
- [x] LTB notices (Ontario N-series)
- [x] Maintenance tracking (status, cost, invoice)
- [x] Document storage with categories
- [x] Lease end reminders on dashboard
- [x] T776 tax report export
- [x] Billing workflow page (`computeBillingReadiness`, next steps)
- [x] PWA (manifest, service worker, offline shell)

---

## Not built

- [ ] Global search (documents, tenants, properties, statements)
- [ ] Property document hub (folder mental model per property)
- [ ] Document tags UI (`Document.tags` field exists in schema)
- [ ] Auto-categorization on upload
- [ ] Utility profiles (reusable split presets)
- [ ] Property timeline
- [ ] Property health score per property
- [ ] Maintenance timeline view
- [ ] Tenant self-service portal
- [ ] OCR bill reading
- [ ] SMS / automated email reminders (overdue, inspection, maintenance)
- [ ] Google / Apple sign-in
- [ ] Landlord subscription billing
- [ ] REST API `/api/v1` for native apps
- [ ] Native iOS/Android (Expo)

---

## Navigation (current vs strategy)

**Strategy doc** suggested flat nav: Dashboard → Properties → Tenants → Documents → Statements → Maintenance → Reports → Settings.

**Current app** (`src/lib/navigation.ts`) groups:

- Home
- Properties (All properties, Tenants, Inspections)
- Billing (Monthly workflow, Statements, Utility bills, Payments, Tax reports)
- Documents (All files, Notices)
- Maintenance
- Settings (Account, Profile, Integrations)

**Recommendation:** Keep grouped nav; add global search and dashboard shortcuts to meet the 2-click goal.

---

## Architecture constraints for future work

| Constraint | Implication |
|------------|-------------|
| Server Actions for mutations | Native apps need `/api/v1` REST layer |
| Cookie session auth | Mobile needs Bearer token + optional Google token exchange |
| Money in integer cents | All APIs and mobile clients must use cents |
| `src/lib/*` owns business logic | New API routes call lib functions, don't duplicate |
| Local install (`isLocalDataOnlyDeploy`) | Subscription and cloud OAuth apply to hosted deploy only |
| CASL (Canada) | SMS requires tenant opt-in tracking |
