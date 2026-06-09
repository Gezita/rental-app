# UX & Animation

Dashboard redesign direction, navigation principles, and a calm motion system aligned with the Zigglo design language.

**Phases:** Phase 1 (foundation), Phase 3 (billing polish) — see [phases.md](./phases.md)

Related: [STYLE_GUIDE.md](../../STYLE_GUIDE.md), [zigglo_ux_ui_qa_recommendations.md](../../zigglo_ux_ui_qa_recommendations.md)

---

## Design principles

From the Zigglo style guide:

1. **Easy on the eyes** — calm, editorial interface for long billing sessions
2. **Scannable** — one primary metric per card
3. **Accessible** — body text ≥ 14px; focus rings on interactive elements
4. **Server-first** — animate client islands only

Motion must **clarify state**, not decorate.

---

## Dashboard redesign

### Focus on actions, not charts

| Section | Content |
|---------|---------|
| **Top** | Monthly rent collected, outstanding balances, occupancy, open maintenance |
| **Middle** | Recent activity, recent uploads, upcoming tasks |
| **Bottom** | Property cards with quick status |

### Existing building blocks

- `hero-kpi-row.tsx` — dashboard KPIs
- `billing-workflow.ts` — readiness percent, next steps
- `onboarding-checklist.tsx` — new user guidance
- Billing page progress bar (`transition-all` on primary fill)

### Tasks (Phase 1)

- [ ] Wire upcoming tasks from billing readiness + lease reminders + overdue
- [ ] Recent uploads feed from `Document` ordered by `createdAt`
- [ ] Property cards: occupancy, overdue count, missing utilities flag
- [ ] Reduce chart-heavy patterns; prefer actionable lists

---

## Navigation

### Goals

- Everything reachable within **2 clicks**
- Avoid hiding critical paths

### Current structure

Grouped nav: Home → Properties → Billing → Documents → Maintenance → Settings.

**Do not flatten entirely** — landlords think in monthly billing vs portfolio.

### Improvements

- [ ] **Global search** (⌘K) — primary way to hit "find lease in 10s"
- [ ] Recent items / pins on dashboard
- [ ] Consider renaming "Billing" → "Statements & utilities" in UI copy if clearer
- [ ] Mobile: bottom nav OR improved hamburger (`AppHeader`)

---

## Mobile UX priorities

| Task | Target metric |
|------|----------------|
| Upload document / bill | < 30 seconds |
| Find lease | < 10 seconds (with search) |
| View tenant / property | < 5 seconds |
| Record payment | 2 taps from statement |

See [mobile.md](./mobile.md) for technical mobile work.

---

## Animation system

### Principles

1. **Purposeful** — loading, success, navigation, progress
2. **Short** — 150–300ms UI; 400–600ms max page-level
3. **Respect `prefers-reduced-motion`**
4. **Consistent easing** — one standard curve
5. **No motion on Server Components** — wrap small client children

### Current state

- CSS `transition-*` on buttons, cards, nav
- `animate-pulse` on `loading.tsx`
- No Framer Motion in `package.json`

### Proposed tokens (`globals.css`)

```css
:root {
  --motion-fast: 150ms;
  --motion-normal: 250ms;
  --motion-slow: 400ms;
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Where animation helps

| Area | Treatment |
|------|-----------|
| Dashboard KPIs | Optional count-up on first paint (`tabular-nums`) |
| Billing workflow | Step progress + staggered steps |
| Statement send success | Subtle scale + fade (no confetti) |
| Page transitions | Light cross-fade (View Transitions API when stable) |
| Mobile nav | Slide-in drawer + backdrop fade |
| Flash alerts | Slide down + auto-dismiss |
| Loading | Skeleton shimmer vs plain pulse |
| Tenant pay page | Button press + success state |
| Empty states | Very subtle icon motion (optional) |

### Technology choice

| Approach | When |
|----------|------|
| Tailwind + CSS | **Start here** — hovers, skeletons, drawer, progress |
| View Transitions API | Next.js route transitions when stable |
| Framer Motion (`motion`) | Complex stagger, shared layout — only if CSS insufficient |
| Lottie | Marketing only — not core dashboard |

### Proposed structure

```text
src/lib/motion.ts
src/components/motion/
  fade-in.tsx
  slide-in.tsx
  count-up.tsx
  skeleton.tsx
```

```ts
function usePrefersReducedMotion(): boolean
```

### Native (Phase 4)

`react-native-reanimated` on Expo — match durations/easing from web tokens.

---

## Animation phasing

| Step | Scope |
|------|--------|
| A1 | Motion tokens + `prefers-reduced-motion` globally |
| A2 | Skeleton loaders — dashboard, statements, properties |
| A3 | Mobile nav slide; flash alert enter/exit |
| A4 | Billing workflow step animations + progress |
| A5 | KPI count-up; optional Framer Motion |
| A6 | Marketing/landing motion (if separate site) |

### What to avoid

- Parallax, heavy blur, looping backgrounds
- Animating every row on large tables
- Confetti on routine actions
- Motion that fights the calm brand

---

## Success metrics (UX release criteria)

| Goal | Target | Primary UX lever |
|------|--------|------------------|
| Find lease | < 10s | Global search + property doc hub |
| Upload utility bill | < 30s | Mobile camera + defaults |
| Generate statements | < 1 min | Billing workflow clarity |
| Find maintenance | < 15s | Property timeline |
| Property status | < 5s | Property health cards |

---

## Suggested build order (UX vs animation)

1. **Search + document hub** — functional speed before motion
2. **Skeleton loaders (A2)** — perceived performance
3. **Dashboard action layout** — tasks, uploads, property cards
4. **Mobile nav + alerts (A3)** — phone polish
5. **Billing workflow motion (A4)** — after subscribe/billing flows exist
