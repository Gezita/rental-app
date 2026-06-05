# Rentals Dashboard — Style Guide

A calm, warm interface for long reading sessions: soft neutrals, teal accents, and clear hierarchy.

## Principles

1. **Easy on the eyes** — Warm stone backgrounds (`#f6f5f2`), not pure white pages or harsh slate grays.
2. **Scannable** — One primary metric per card; group related counts; use icons and color only where they add meaning.
3. **Consistent** — Use shared UI components and CSS variables; avoid one-off hex values in pages.
4. **Accessible** — Body text ≥ 14px; muted text still meets contrast on white; focus rings on interactive elements.
5. **Server-first** — Prefer Server Components; add `"use client"` only for interactivity (forms, dismiss, pending state).

## Color Palette

| Role | Token | Hex | Usage |
|------|--------|-----|--------|
| Page background | `--background` | `#f6f5f2` | App shell, auth pages |
| Text | `--foreground` | `#1c1917` | Headings, body |
| Muted text | `--muted` | `#78716c` | Descriptions, labels |
| Surface | `--surface` | `#ffffff` | Cards, sidebar, header |
| Border | `--border` | `#e7e5e4` | Card and input borders |
| Primary | `--primary` | `#0d9488` | Buttons, links, active nav |
| Primary hover | `--primary-hover` | `#0f766e` | Button hover |
| Success | `--success` | `#059669` | Collected rent, paid status |
| Warning | `--warning` | `#b45309` | Leases, partial payments |
| Danger | `--danger` | `#be123c` | Overdue, destructive actions |

Semantic backgrounds: `--primary-muted`, `--success-muted`, `--warning-muted`, `--danger-muted` for alerts and tinted cards.

Define new tokens in `src/app/globals.css` under `:root` and `@theme inline`.

## Typography

- **Font:** DM Sans (loaded in root layout).
- **Page title:** `text-2xl font-semibold tracking-tight text-foreground`
- **Section title:** `text-lg font-semibold`
- **Card metric:** `text-2xl font-semibold tabular-nums`
- **Labels:** `text-sm text-muted`
- **Uppercase section labels:** `text-xs font-semibold uppercase tracking-wider text-muted`

Use `tabular-nums` on money and counts. Format currency with `formatMoney()` from `src/lib/money.ts`.

## Spacing & Layout

- Page padding: `p-4 sm:p-6` inside main content.
- Section gaps: `space-y-8` between major blocks.
- Card grids: `gap-4` for stats, `gap-6` for two-column sections.
- Max content width: `max-w-7xl` (set in `dashboard-shell.tsx`).
- Form pages: often `max-w-xl` for focused inputs (import, settings).

## Components

### UI primitives (`src/components/ui/index.tsx`)

| Component | Variants / notes |
|-----------|------------------|
| `Button` | `default`, `outline`, `ghost`, `destructive`; sizes `default`, `sm` |
| `Card` | `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` |
| `Badge` | `default`, `secondary`, `success`, `warning`, `danger` |
| `Alert` | `default`, `error`, `warning`, `info` |
| `Input`, `Label`, `Select` | Form fields — use with server actions |

### Layout

| Component | Location | Notes |
|-----------|----------|--------|
| `DashboardShell` | `layout/dashboard-shell.tsx` | Sidebar, header, auth gate |
| `NavLink` | `layout/nav-link.tsx` | Active state for sidebar |
| `PageBackNav` | `layout/page-back-nav.tsx` | Breadcrumb-style back link |
| `AppHeader` | `layout/app-header.tsx` | Mobile menu |

### Dashboard

| Component | Location | Notes |
|-----------|----------|--------|
| `StatCard` | `dashboard/stat-card.tsx` | KPIs with optional icon, accent, href |
| `PageHeader` | `dashboard/page-header.tsx` | Title, description, action slot |
| `OnboardingChecklist` | `dashboard/onboarding-checklist.tsx` | Setup progress steps |

### Forms & feedback

| Component | Location | Notes |
|-----------|----------|--------|
| `SubmitButton` | `submit-button.tsx` | Client; uses `useFormStatus` for pending label |
| `FlashAlert` | `flash-alert.tsx` | Client; dismissible URL-param alerts |
| `ConfirmDeleteForm` | `confirm-delete-form.tsx` | Typed name confirmation |
| `PaymentStatusBadge` | `payment-status-badge.tsx` | Statement payment state |
| `UtilityBillsImportForm` | `utility-bills-import-form.tsx` | Preview → confirm modal flow |

### Filters (server-rendered link filters)

- `StatementsPaymentFilter`, `StatementsUnitFilter`, `UtilityBillsFilter` — use URL search params, not client state.

## Cards

- Default: white surface, `border-border`, soft shadow, `rounded-xl`.
- Stat cards: optional left accent bar (`accent`: `primary` | `success` | `warning` | `danger` | `neutral`).
- Info banners: `Alert` or tinted `Card` with semantic border/background tokens.
- List rows: `rounded-lg border border-border bg-surface-muted/40 px-4 py-3` with hover state.

## Buttons

- **Primary:** Teal fill — main actions (Add Property, Save, Replace and save).
- **Outline:** White with border — secondary actions (Generate Statements, View).
- **Ghost:** Navigation and low-emphasis controls.
- **Destructive:** Rose — delete only.

Disable buttons during async work (`disabled`, `aria-busy`).

## Status Badges

| Variant | Meaning |
|---------|---------|
| `success` | Paid |
| `warning` | Partial, pending online |
| `danger` | Overdue |
| `secondary` | Categories, informational |
| `default` | Draft, neutral |

Payment status logic lives in `src/lib/payment-status.ts` — use `PaymentStatusBadge` rather than duplicating rules.

## Page Patterns

### List pages

```tsx
<PageHeader title="…" description="…" actions={<Link href="…"><Button>…</Button></Link>} />
<FlashAlert>…</FlashAlert>  {/* optional, from searchParams */}
<Card>…table or list…</Card>
```

### Detail pages

```tsx
<PageBackNav parent={{ href: "…", label: "…" }} />
<h1 className="text-2xl font-bold">…</h1>
{/* sections in Cards */}
```

### Server actions in forms

```tsx
<form action={someAction.bind(null, id)} className="space-y-4">
  <Input name="…" required />
  <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
</form>
```

Redirect with `?error=…` or `?saved=1` for feedback; show via `FlashAlert`.

### Loading states

Add `loading.tsx` next to route segments for skeleton UI. Dashboard has a shared skeleton at `src/app/(dashboard)/loading.tsx`.

## Icons

Use `lucide-react`. Import only needed icons (Next.js optimizes via `optimizePackageImports` in `next.config.ts`).

Common dashboard icons: `Building2`, `FileText`, `CircleDollarSign`, `Banknote`, `Wrench`, `AlertCircle`, `Clock`.

## Do / Don't

**Do**

- Use `formatMoney()` for currency.
- Use semantic color tokens (`text-danger`, `text-success`).
- Use `cn()` from `src/lib/utils.ts` for conditional classes.
- Keep destructive actions behind typed confirmation.
- Put validation in `src/lib/validation.ts` and business rules in `src/lib/`.

**Don't**

- Use raw Tailwind color scales (`text-red-700`) — use semantic tokens.
- Import heavy server libraries (`xlsx`, `pdf-lib`) in client components.
- Stack many identical small cards (hard to scan).
- Use pure `#000` or `#fff` page backgrounds.
- Duplicate `MONTH_NAMES` or utility option lists — use `src/lib/billing-constants.ts`.

## Extending

1. Add CSS variables in `globals.css`.
2. Add or extend components in `src/components/ui/index.tsx`.
3. Document new tokens and patterns in this file.
4. For new billing/validation rules, add to `src/lib/` not inline in pages.
