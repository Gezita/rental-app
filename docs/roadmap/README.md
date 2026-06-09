# Zigglo Product Roadmap

Planning documents for Zigglo's product strategy, phased delivery, and platform expansion. These files synthesize product positioning, current implementation status, and future work discussed for mobile, monetization, notifications, and UX.

## Documents

| File | Contents |
|------|----------|
| [product-strategy.md](./product-strategy.md) | Positioning vs RentRedi, vision, success metrics, what to build / avoid |
| [implementation-status.md](./implementation-status.md) | Strategy doc mapped to the current codebase |
| [phases.md](./phases.md) | **Master phased roadmap** — Phase 0 through Phase 4 with checklists |
| [mobile.md](./mobile.md) | Mobile web, PWA, API v1, native iOS/Android (Expo) |
| [auth-and-monetization.md](./auth-and-monetization.md) | Google sign-in, unit-based subscription pricing |
| [notifications.md](./notifications.md) | SMS/email reminders, cron, CASL compliance |
| [ux-and-animation.md](./ux-and-animation.md) | Dashboard redesign, navigation, motion system |

## Related docs (existing)

| File | Role |
|------|------|
| [LANDLORD_BILLING_APP_ARCHITECTURE_MVP.md](../../LANDLORD_BILLING_APP_ARCHITECTURE_MVP.md) | Technical architecture and module map |
| [production-plan.md](../../production-plan.md) | Neon, R2, Resend infrastructure |
| [zigglo_ux_ui_qa_recommendations.md](../../zigglo_ux_ui_qa_recommendations.md) | UX audit and polish tasks |
| [STYLE_GUIDE.md](../../STYLE_GUIDE.md) | UI tokens and component patterns |

## Phase overview

| Phase | Name | Timeline (est.) | Focus |
|-------|------|-----------------|-------|
| **0** | Production foundation | Weeks 1–4 | Neon, R2, Resend, hosted vs local deploy |
| **1** | Workspace speed | Weeks 4–10 | Search, document hub, utility profiles, mobile web |
| **2** | Differentiators | Weeks 10–18 | Property timeline, health cards, expense rollup |
| **3** | Growth & retention | Weeks 18–28 | Subscription, Google auth, reminders, tenant portal |
| **4** | Platform expansion | Month 7+ | Native apps, OCR, deeper integrations |

See [phases.md](./phases.md) for full task checklists and dependencies.

## Core positioning (one line)

> **Zigglo is the rental property workspace for independent landlords (1–50 units)** — not another accounting platform or rent-collection company.

## 90-day priority (if scope must be tight)

1. Global search + property document hub  
2. Utility profiles + billing workflow polish  
3. Property timeline (MVP)  
4. Mobile web upload + statement/overdue views  
5. Production deploy (Neon + R2 + Resend)
