# src/app/(dashboard) — Dashboard pages

All authenticated landlord-facing pages. The layout at `layout.tsx` wraps everything in the `DashboardShell` with sidebar nav and requires authentication.

## Rules

- Pages are **Server Components by default**. Add `"use client"` only for forms, flash-alert dismiss, or pending state.
- Every page that fetches data must call `requireUser()` then an ownership helper from `src/lib/ownership.ts`.
- Flash feedback uses URL params (`?error=…` or `?saved=1`) read by `FlashAlert`.
- Filters (payment status, unit, etc.) use URL search params, not client state.

## Route map

| Route | Feature |
|-------|---------|
| `dashboard/` | Home — hero stats, lease reminders, overdue summary |
| `properties/` | Property list |
| `properties/[propertyId]/` | Property detail — units, utility bills, finances |
| `properties/[propertyId]/units/[unitId]/` | Unit detail — tenant, lease, utilities |
| `properties/[propertyId]/units/[unitId]/lease/wizard/` | Multi-step lease creation wizard |
| `properties/[propertyId]/units/[unitId]/lease/standard-lease/` | Ontario Form 2229e fill |
| `properties/[propertyId]/units/[unitId]/lease/complete/` | Lease signing completion |
| `properties/[propertyId]/units/[unitId]/statements/` | Unit statement history |
| `properties/[propertyId]/units/[unitId]/utilities/` | Utility split rules for unit |
| `properties/[propertyId]/utility-bills/` | Utility bills for a property |
| `properties/[propertyId]/utility-connect/` | Connect utility bill to unit |
| `tenants/` | All tenants across the portfolio |
| `billing/` | Monthly billing workflow |
| `billing/statements/` | All statements (filters: payment status, unit) |
| `billing/utility-bills/` | All utility bills |
| `billing/payments/` | Payment history |
| `billing/tax-reports/` | T776 rental income tax report |
| `documents/` | Document library — all uploaded files |
| `documents/notices/` | LTB notices — fill, generate, send |
| `inspections/` | Inspection list |
| `inspections/new/` | Create new inspection |
| `inspections/[inspectionId]/` | Inspection detail and checklist |
| `maintenance/` | Maintenance requests |
| `settings/` | Account settings |
| `settings/profile/` | Landlord profile (shown on emails and PDFs) |
| `settings/integrations/` | Stripe, DocuSign, Resend credentials |

## Page patterns

**List page:**
```tsx
<PageHeader title="…" action={<Button>…</Button>} />
<FlashAlert />   {/* optional */}
<Card><table>…</table></Card>
```

**Detail page:**
```tsx
<PageBackNav href="…" label="…" />
<h1>…</h1>
<Card>…</Card>
<Card>…</Card>
```

**Tabbed section** (billing, documents, settings): render `<PageTabs tabs={billingTabs} />` from `src/lib/section-tabs.ts` below the header, then route-specific content.
