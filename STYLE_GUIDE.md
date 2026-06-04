# Rentals Dashboard — Style Guide

A calm, warm interface for long reading sessions: soft neutrals, teal accents, and clear hierarchy.

## Principles

1. **Easy on the eyes** — Warm stone backgrounds (`#f6f5f2`), not pure white pages or harsh slate grays.
2. **Scannable** — One primary metric per card; group related counts; use icons and color only where they add meaning.
3. **Consistent** — Use shared UI components and CSS variables; avoid one-off hex values in pages.
4. **Accessible** — Body text ≥ 14px; muted text still meets contrast on white; focus rings on interactive elements.

## Color palette

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

## Typography

- **Font:** DM Sans (loaded in root layout).
- **Page title:** `text-2xl font-semibold tracking-tight text-foreground`
- **Section title:** `text-lg font-semibold`
- **Card metric:** `text-2xl font-semibold tabular-nums`
- **Labels:** `text-sm text-muted`
- **Uppercase section labels:** `text-xs font-semibold uppercase tracking-wider text-muted`

Use `tabular-nums` on money and counts.

## Spacing & layout

- Page padding: `p-4 sm:p-6` inside main content.
- Section gaps: `space-y-8` between major blocks.
- Card grids: `gap-4` for stats, `gap-6` for two-column sections.
- Max content width: `max-w-7xl` (set in dashboard shell).

## Components

| Component | Location | Notes |
|-----------|----------|--------|
| `Button`, `Card`, `Badge`, etc. | `src/components/ui/index.tsx` | Use variants; don’t duplicate styles |
| `StatCard` | `src/components/dashboard/stat-card.tsx` | KPIs with optional icon and accent |
| `PageHeader` | `src/components/dashboard/page-header.tsx` | Title, description, actions |
| `NavLink` | `src/components/layout/nav-link.tsx` | Active state for sidebar |

## Cards

- Default: white surface, `border-border`, soft shadow, `rounded-xl`.
- Stat cards: optional left accent bar (`accent`: primary | success | warning | danger | neutral).
- Info banners: use `Alert` or tinted `Card` with semantic border/background tokens.

## Buttons

- **Primary:** Teal fill — main actions (Add Property, Save).
- **Outline:** White with border — secondary actions (Generate Statements, View).
- **Ghost:** Navigation and low-emphasis controls.
- **Destructive:** Rose — delete only.

## Status badges

| Variant | Meaning |
|---------|---------|
| `success` | Paid |
| `warning` | Partial, pending online |
| `danger` | Overdue |
| `secondary` | Categories, informational |
| `default` | Draft, neutral |

## Do / Don’t

**Do**

- Use `formatMoney()` for currency.
- Keep dashboard KPI row to 4 cards; group smaller counts in one section.
- Use `PageHeader` on list pages for consistency.

**Don’t**

- Use `text-red-700` / `text-green-700` directly — use `text-danger` / `text-success`.
- Stack many identical small cards (hard to scan).
- Use pure `#000` or `#fff` page backgrounds.

## Extending

New colors belong in `src/app/globals.css` under `:root` and `@theme inline`, then referenced in UI components. Document additions in this file.
