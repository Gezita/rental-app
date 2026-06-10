# Product Strategy

## Executive summary

Zigglo should **not** compete feature-for-feature with RentRedi, Buildium, or AppFolio. Those products have large teams, payment infrastructure, screening partnerships, and enterprise support.

Instead, Zigglo focuses on becoming the **best landlord workspace** for small portfolio landlords (1–50 units), especially in Ontario where utility splits and document chaos are daily problems.

### Vision

**"Everything related to a rental property in one place."**

Alternate positioning lines:

- **Rental Property Workspace** (preferred over "Property Management Software")
- **The Operating System for Independent Landlords**

### Final product vision

Zigglo becomes the place where landlords **organize and operate** their rental business — not another accounting platform, not another rent-collection platform. A clean, modern workspace that makes rental property administration dramatically easier.

---

## How to beat RentRedi without becoming RentRedi

| RentRedi wins on | Zigglo wins on |
|------------------|----------------|
| Rent collection UX | Utility-split workflow |
| Tenant mobile apps | Monthly statement generation |
| Tenant screening | Document organization |
| Listings | Ontario LTB tooling |
| Brand scale | Calm UX, speed to find things |

### Competitive one-liner (website)

> RentRedi helps you collect rent. Zigglo helps you **run** a small rental business — utility splits, monthly statements, every lease and bill in one place, and Ontario landlord forms when you need them. Built for duplexes and triplexes, not enterprise portfolios.

---

## Core problems (monthly landlord jobs)

Landlords experience these every month:

- Organizing documents (email, Dropbox, desktop folders, paper)
- Managing utility bills and splits
- Tracking expenses and maintenance
- Generating tenant statements
- Finding information quickly

---

## Priority 1 features (highest value / lowest effort)

### 1. Document vault

**Problem:** Files fragmented across email, cloud drives, desktop, and paper.

**Solution:** Structured document repository per property:

```text
Property
├── Leases
├── Utility Bills
├── Insurance
├── Tax Documents
├── Photos
├── Maintenance
└── Miscellaneous
```

**Improvements to build:**

- Smart tags (Tax, Lease, Utility, Insurance, Contractor)
- Search by property, tenant, filename, tag, date
- Auto-categorization suggestions on PDF upload (e.g. "Hydro One Invoice" → Utility Bills)

### 2. Monthly statement generator

**Problem:** Many landlords manually create invoices.

**Solution:** Auto-generate statements with rent, utilities, credits, discounts, late fees, other charges, and total due.

**Improvements to build:**

- Modern PDF templates (professional appearance)
- Recurring charges (rent, internet, parking, storage) each month
- Permanent statement history

### 3. Utility management (signature feature)

**Problem:** Ontario rentals often split utilities; workflow is messy.

**Improvements to build:**

- Utility rules per unit (60/40, equal split, etc.)
- **Utility profiles** — reusable presets (Duplex 60/40, Triplex Equal, Basement 30 / Main 70)
- Bill workflow: Upload → Select property → Review split → Generate statements → Done

### 4. Maintenance center

**Problem:** Maintenance records and contractor invoices get lost.

**Improvements to build:**

- Maintenance item with status, photos, contractor, cost, documents, completion date
- **Timeline view** — chronological history (useful during resale)

---

## Priority 2 features (after MVP adoption)

### 5. Property health dashboard

Per-property score based on occupancy, maintenance costs, rent collection, outstanding balances.

### 6. Expense tracking (simple)

Not accounting software. Track maintenance, utilities, taxes, insurance, renovations. Show yearly totals.

### 7. Tenant portal (minimal)

Tenants can:

- Download statements
- Upload documents
- Submit maintenance requests

Avoid building payments into the portal initially (pay link can exist separately).

### 8. Property timeline

High-value differentiator — unified chronological feed:

```text
2024 — Lease signed
2024 — Water heater replaced
2025 — Insurance renewed
2025 — Hydro bill uploaded
2026 — Lease renewed
```

---

## Priority 3 features (after product–market fit)

### 9. OCR & AI extraction

Extract utility amounts, invoice numbers, due dates, vendor names from uploaded PDFs.

### 10. Smart reminders

Notify when insurance expires, lease expires, utilities missing, rent increases available, rent overdue.

### 11. Ontario landlord toolkit

N4, N5, N12, LTB documents — regional differentiation. (Partially built today.)

---

## UX direction

### Dashboard redesign

Focus on **actions**, not charts.

| Section | Content |
|---------|---------|
| **Top** | Monthly rent, outstanding balances, occupancy, maintenance requests |
| **Middle** | Recent activity, recent uploads, upcoming tasks |
| **Bottom** | Property cards, quick access |

### Navigation

Everything reachable within **2 clicks**. Prefer **global search** (⌘K) over flattening all nav items. Current grouped nav (Properties, Billing, Documents) is acceptable if search is strong.

### Mobile

Mobile is **not** a secondary experience. Prioritize:

- Upload document
- Find lease
- View tenant / property
- Record expense / payment

---

## Success metrics

A landlord should be able to:

| Goal | Target |
|------|--------|
| Find a lease | Under 10 seconds |
| Upload a utility bill | Under 30 seconds |
| Generate statements | Under 1 minute |
| Find maintenance records | Under 15 seconds |
| View property status | Under 5 seconds |

Use these as **release criteria** for Phase 1 UX work.

---

## Features to avoid (expensive, low differentiation)

| Feature | Why defer |
|---------|-----------|
| Full accounting / GL | Buildium does this; stay focused |
| Tenant screening | Requires partnerships |
| Listing syndication | Commodity |
| Full CRM | Unnecessary complexity |
| Multi-user teams | Until single-landlord PMF |
| Feature parity with AppFolio / Buildium | Wrong market |

### Online rent payments — special case

The strategy doc originally said "avoid payments." **Zigglo already has Stripe** for tenant pay links (`/pay/[token]`).

**Reframe, don't rip out:**

| Do | Don't |
|----|-------|
| "Record payments and send receipts" | Lead marketing with rent collection |
| Keep Stripe in Settings → Integrations, off by default | Invest in chargeback tooling early |
| Treat pay link as optional convenience | Position as a payments company |

---

## What NOT to build (agree)

- Full double-entry accounting
- Tenant screening / credit checks
- Listing syndication
- Full CRM
- Enterprise portfolio features
- Multi-user roles (until PMF)
