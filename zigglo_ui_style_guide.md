# Zigglo UI Style Guide

Design language for **zigglo** — landlord billing and document management.

> **Brand assets:** `public/brand/zigglo-icon.png` (app icon) · `public/brand/zigglo-logo.png` (wordmark)  
> **Implementation:** tokens in `src/app/globals.css` · logo component `src/components/layout/brand-logo.tsx`

---

## 1. Brand Identity

**Name:** zigglo (always lowercase in UI)

**Logo:**
- **Icon** — tiered ziggurat mark with house + document motifs on cream rounded square
- **Full logo** — icon + “zigglo” wordmark (terracotta dot on the “i”)

**Personality:** Organized, trustworthy, calm — editorial surfaces for long billing sessions.

---

## 2. Color Palette (from logo)

| Role | Hex | CSS variable | Usage |
|------|-----|--------------|-------|
| Cream canvas | `#f8f7f2` | `--background` | Page background |
| Charcoal | `#1e2328` | `--foreground` | Headings, logo blocks |
| Terracotta | `#c46b41` | `--primary` | CTAs, active nav, links, “i” dot |
| Terracotta hover | `#a85a36` | `--primary-hover` | Button hover |
| Terracotta tint | `#fdf4ef` | `--primary-muted` | Active nav, alerts |
| White | `#ffffff` | `--surface` | Cards, sidebar |
| Border | `#e8e6e1` | `--border` | Card edges |

**Accent discipline:** Terracotta is for primary actions and key highlights only — not large background fills.

---

## 3. Typography

**Font:** DM Sans

| Level | Style |
|-------|-------|
| Page title | `text-2xl sm:text-3xl font-semibold tracking-tight` |
| Section label | `text-xs font-semibold uppercase tracking-wider text-muted` |
| Body | `text-sm leading-relaxed` |
| Money | `tabular-nums font-semibold` |

---

## 4. Logo Usage

```tsx
import { BrandLogo } from "@/components/layout/brand-logo";

// Sidebar — full wordmark
<BrandLogo variant="full" />

// Mobile header — icon only
<BrandLogo size="sm" variant="icon" />

// Auth pages — large full logo
<BrandLogo size="lg" variant="full" href="/sign-in" />
```

**Do not** recreate the logo with icons or text — use the PNG assets.

---

## 5. Components

| Element | Spec |
|---------|------|
| Cards | `rounded-2xl`, white on cream canvas, `shadow-sm` |
| Buttons | `rounded-xl`, terracotta primary, `font-semibold` |
| Inputs | `rounded-xl`, cream/white, terracotta focus ring |
| Nav (active) | `bg-primary-muted` + 3px left terracotta bar |
| Stat cards | Left accent bar in semantic color |

---

## 6. App Icons & PWA

| Asset | Path |
|-------|------|
| Favicon / app icon | `src/app/icon.png` (from brand icon) |
| Apple touch icon | `src/app/apple-icon.png` |
| Manifest icons | `/brand/zigglo-icon.png` |
| Theme color | `#c46b41` |
| Background | `#f8f7f2` |

---

## 7. Email Templates

- Header: charcoal gradient (`#1e2328` → `#3d454d`)
- Brand label: terracotta “zigglo” uppercase
- Body background: cream `#f8f7f2`

---

## 8. Do / Don't

**Do**
- Use official logo PNGs via `BrandLogo`
- Keep page background cream, cards white
- Use terracotta sparingly for CTAs

**Don't**
- Write “Zigglo” or “Rentals” — use **zigglo**
- Use indigo, teal, or blue as brand color
- Replace logo with Lucide icons

---

## 9. File Reference

| File | Role |
|------|------|
| `public/brand/zigglo-icon.png` | Square app icon |
| `public/brand/zigglo-logo.png` | Full logo with wordmark |
| `src/components/layout/brand-logo.tsx` | Logo component |
| `src/app/globals.css` | Design tokens |
| `STYLE_GUIDE.md` | Component patterns |
