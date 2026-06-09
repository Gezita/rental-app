# zigglo

Landlord billing and document management for small portfolios (1–20 units). Built for Ontario landlords who split shared utilities, generate monthly tenant statements, and keep leases, bills, and maintenance records in one place.

## Quick Start

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine on Linux) and Node.js 20+

### macOS (double-click)

1. **Install:** double-click `install.command` in Finder  
   (If macOS blocked: right-click → **Open** → **Open** once.)
2. **Run:** double-click **zigglo** on your Desktop (or `start.command`)

> **Note:** The double-click installer sets up a local SQLite file. For PostgreSQL (matches production), use **Terminal → `make setup`** below instead.

To recreate the Desktop shortcut, double-click `create-shortcut.command`.

### Terminal (macOS or Linux) — recommended

If you don't have Node.js 20:
```bash
make install-node   # installs fnm (Node version manager)
# restart your terminal, then:
fnm install 20 && fnm default 20
```

First-time setup (creates `.env`, starts Postgres, installs deps, seeds demo data):

```bash
make setup
make dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo account:** `demo@landlord.app` / `demo1234`

Run `make help` to see all available commands.

### Without Make

```bash
cp .env.example .env
docker compose up -d   # start Postgres
npm install
npm run db:setup       # push schema + seed demo data
npm run dev
```

### Common commands

| Command | What it does |
|---------|-------------|
| `make help` | List all make targets |
| `make install-node` | Install fnm (Node version manager) |
| `make setup` | First-time setup (env, Postgres, deps, schema, seed) |
| `make dev` | Start app (PostgreSQL or SQLite — see `make db-status`) |
| `make dev-sqlite` | Start app on local `prisma/dev.db` (no Docker) |
| `make db-up` | Start Postgres container |
| `make db-down` | Stop Postgres container (data is kept) |
| `make db-use-sqlite` | Switch to SQLite file (`prisma/dev.db`) |
| `make db-use-postgres` | Switch to PostgreSQL (Docker) |
| `make db-status` | Show which database mode is active |
| `make db-backup-sqlite` | Copy `prisma/dev.db` to `prisma/backups/` |
| `make db-reset` | Wipe and reseed the active database |
| `make db-import-sqlite` | Copy `prisma/dev.db` into PostgreSQL |
| `make studio` | Open Prisma Studio at http://localhost:5555 |

## Local database

The app supports two local database modes. **PostgreSQL (Docker)** is the default and matches production. **SQLite** (`prisma/dev.db`) is a single portable file that's easy to back up.

### PostgreSQL (default)

Docker stores data in a named volume (`postgres_data`). **Stopping Docker does not delete your data.**

| Action | Data safe? |
|--------|------------|
| `make db-down` / `docker compose down` | Yes |
| `docker compose stop` | Yes |
| Quit Docker Desktop | Yes — data returns when Docker starts again |
| `docker compose down -v` | **No** — removes volumes |
| `docker volume rm …` | **No** |

Connect with psql:

```bash
docker compose exec db psql -U rental -d rental_app
```

### SQLite (portable file)

Your live data can live in **`prisma/dev.db`** (gitignored, not in commits). Use this when you want a file you can copy or back up directly.

```bash
make db-use-sqlite      # switch .env + Prisma schema
make dev-sqlite         # run app (no Docker)
make db-backup-sqlite   # copy to prisma/backups/
```

Each `make db-use-*` switch auto-backs up `prisma/dev.db` before changing modes.

### Switch between modes

```bash
make db-status          # what am I using now?

# SQLite — portable file, no Docker
make db-use-sqlite
make dev-sqlite

# PostgreSQL — matches production
make db-use-postgres
make db-up && make dev
```

### Copy SQLite → PostgreSQL

After working in SQLite mode, import into Postgres:

```bash
make db-use-postgres
make db-up
make db-import-sqlite ARGS="--dry-run"    # preview row counts
make db-import-sqlite ARGS="--replace"    # replace Postgres with SQLite data
```

Upsert without clearing Postgres: `make db-import-sqlite`

Custom SQLite path: `SQLITE_PATH=/path/to/dev.db npm run db:import-sqlite`

## Features

### Core billing

- Properties, units, and tenants (with automatic lease record on tenant creation)
- Utility split rules per unit (gas, water, electricity, internet, other)
- Utility bill upload with automatic split calculation across units
- **Bill database (.xlsx)** — upload monthly gas, water, and electricity amounts; statements auto-fill matching months
- Monthly statement generation (draft → send → partial/paid → receipt)
- **Partial payments** with balance tracking and receipt generation
- Prior-month balance roll-forward for sent, overdue, and partial statements (not drafts)

### Communications & documents

- **LTB N-series notices** — download official Ontario forms, upload, and email tenants
- **Tenant announcements** with professional HTML email layout
- Document storage (local `uploads/` folder in dev)
- Maintenance tracking with invoice uploads and receipt repository

### Automation & payments

- **Auto-send statements** on a configurable day of each month (Settings)
- **Lease end reminders** on dashboard
- **Stripe tenant payments** via `/pay/[token]` link in statement emails
- Cron endpoint for scheduled auto-billing

### UX

- Dashboard onboarding checklist, financial overview, and per-property missing-bill alerts
- PWA-ready (manifest, service worker, iOS home screen support)
- Loading skeletons on dashboard navigation

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Database | Prisma + PostgreSQL (Docker locally, Neon in production). Optional SQLite file (`prisma/dev.db`) for portable local backups. |
| Styling | Tailwind CSS 4 |
| Auth | bcrypt + HMAC-signed session cookies |
| PDF | pdf-lib |
| Spreadsheets | xlsx (server-side only) |
| Payments | Stripe Checkout (optional) |
| Email | Console logging in dev; wire to Resend/Postmark for production |

## Environment Variables

Copy `.env.example` to `.env` (or run `make setup` / `make db-use-*` to create it automatically):

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | **PostgreSQL:** `postgresql://rental:rental@localhost:5432/rental_app` · **SQLite:** `file:./dev.db` (use `make db-use-sqlite` to switch) |
| `SESSION_SECRET` | **Production** | HMAC secret for session cookies. App throws at startup if missing in production. |
| `NEXT_PUBLIC_APP_URL` | Stripe / pay links | Public app URL, e.g. `http://localhost:3000` |
| `STRIPE_SECRET_KEY` | Optional | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook signing secret |
| `CRON_SECRET` | Optional | Bearer token for `/api/cron/auto-billing` |

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Create a migration file + apply it |
| `npm run db:seed` | Seed demo data |
| `npm run db:setup` | `db:push` + `db:seed` |
| `npm run db:import-sqlite` | Import legacy SQLite `prisma/dev.db` into PostgreSQL |
| `npm run db:use-sqlite` | Switch local dev to SQLite (`prisma/dev.db`) |
| `npm run db:use-postgres` | Switch local dev to PostgreSQL |
| `npm run db:status` | Show active database mode |

### Utility scripts

```bash
# Test spreadsheet bill parser against sample files
npx tsx scripts/test-parse-bills.ts

# Switch database mode (same as make db-use-*)
npm run db:use-sqlite
npm run db:use-postgres
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/              sign-in, sign-up
│   ├── (dashboard)/         Protected pages (dashboard, properties, statements, …)
│   ├── actions/             Server actions (properties, statements, auth, …)
│   ├── api/                 Stripe webhooks, cron, document download
│   ├── pay/[payToken]/      Tenant payment page
│   └── middleware.ts        Route protection
├── components/
│   ├── ui/                  Shared primitives (Button, Card, Alert, …)
│   ├── layout/              Shell, nav, page back nav
│   └── dashboard/           Stat cards, onboarding checklist
└── lib/
    ├── auth.ts              Session + requireUser (React.cache)
    ├── ownership.ts         requireProperty / requireUnit / requireTenant
    ├── statements.ts        Generation, splits, roll-forward, refresh
    ├── parse-bills-xlsx.ts  Spreadsheet import (server-only)
    ├── validation.ts        Shared input validation
    ├── billing-constants.ts Month names, utility labels
    ├── money.ts             formatMoney, parseMoneyToCents (cents everywhere)
    └── …                    email, pdf, stripe, overdue, auto-billing

prisma/schema.prisma         Data models
prisma/dev.db                Local SQLite file (gitignored; optional dev mode)
prisma/backups/              Auto backups of dev.db when switching modes
public/samples/              Example .xlsx files for bill import
uploads/                     Local file storage (dev)
scripts/                     switch-db-mode.sh, migrate-sqlite-to-postgres.ts, install.sh
```

## Architecture Patterns

- **Server Components by default** — pages fetch data on the server; client components only where needed (forms, flash dismiss, submit pending state).
- **Server actions** — all mutations go through `src/app/actions/`; re-exported from `actions/index.ts`.
- **Authorization** — `requireUser()` + `requireProperty/Unit/Tenant/Statement()` scope every query by `userId`.
- **Money** — always stored as integer cents; use `formatMoney()` for display.
- **Heavy libraries** — `xlsx` is dynamically imported on the server only (never bundled to the client).

## Workflow

1. Sign up or use demo account
2. Create a property and add units
3. Add tenants (creates an active lease automatically) and set utility rules
4. Import or upload utility bills
5. Generate monthly statements
6. Send statements (check terminal for email output in dev)
7. Tenants pay via Stripe link (optional) or landlord records payment
8. Receipts generated automatically

### Bill database & statements

On each property, open **Utility bills → Import bill amounts**:

| Utility | Spreadsheet format |
|---------|-------------------|
| Gas / water | **Month**, **Year**, **Amount** columns |
| Electricity | **Bill Date** + **Bill Amount** (table or label/value rows) |
| Any | **Due Date** + **Amount** billing tables |

- Choose **gas**, **water**, or **electricity** per upload.
- Each upload **replaces** all spreadsheet-sourced bills for that utility on the property (manual bills for other types are unchanged).
- Preview runs on the server; you must confirm before saving.
- Max file size: **10 MB**.
- Sample file: `public/samples/electricity-bills.example.xlsx`

When you **Generate statements** for March, only bills with bill month **March** are included.

**Past statements:** **Statements → Generate** → create a historical statement with payment status (unpaid, paid, partial).

On any open statement, use **Record payment** for full or partial payments.

## Stripe Setup

1. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_APP_URL` in `.env`
2. In [Stripe Dashboard](https://dashboard.stripe.com), add webhook: `{APP_URL}/api/stripe/webhook` — event: `checkout.session.completed`
3. Enable **Stripe card payments** in Settings

## Automatic Statements (Cron)

Set `CRON_SECRET` in `.env`, enable auto-send in Settings, then schedule:

```bash
curl -X POST http://localhost:3000/api/cron/auto-billing \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or use **Run auto-billing now** on the Settings page.

## Install on iOS (Add to Home Screen)

1. Deploy over **HTTPS**
2. Set `NEXT_PUBLIC_APP_URL` and a strong `SESSION_SECRET`
3. Open in **Safari** → **Share** → **Add to Home Screen**

Offline support caches static assets and shows `/offline` when disconnected.

## Troubleshooting

### `MODULE_NOT_FOUND` / webpack chunk errors

Stale Next.js build cache. Clean and rebuild:

```bash
rm -rf .next && npm run build
# or for dev:
rm -rf .next && npm run dev
```

### Database out of sync

```bash
npm run db:push
npm run db:seed   # optional, adds demo user (PostgreSQL or SQLite)
```

Check active mode: `make db-status`

### Lost PostgreSQL data in Docker

Data is only deleted if you ran `docker compose down -v` or removed the volume manually. To restore from SQLite:

```bash
make db-use-postgres && make db-up
make db-import-sqlite ARGS="--replace"
```

### Spreadsheet import fails

Run the parser test script to verify sample files:

```bash
npx tsx scripts/test-parse-bills.ts
```

Check that amounts are in dollars (e.g. `125.50`, not cents). Excel numbers are always interpreted as dollars.

## Production Checklist

- [ ] Set strong `SESSION_SECRET` (app refuses default in production)
- [ ] Set `DATABASE_URL` to Neon (or other managed PostgreSQL)
- [ ] Configure real email provider (replace console logger in `src/lib/email.ts`)
- [ ] Move file storage to S3/R2 (replace local `uploads/` in `src/lib/files.ts`)
- [ ] Set up HTTPS and `NEXT_PUBLIC_APP_URL`
- [ ] Schedule cron for auto-billing
- [ ] Configure Stripe webhooks

## Related Docs

- [`zigglo_ui_style_guide.md`](./zigglo_ui_style_guide.md) — Zigglo design language (tokens, components, layout)
- [`STYLE_GUIDE.md`](./STYLE_GUIDE.md) — Rentals UI conventions and component map
- [`PRODUCT_ROADMAP.md`](./PRODUCT_ROADMAP.md) — roadmap index and phase checklist
- [`docs/roadmap/`](./docs/roadmap/README.md) — detailed strategy, phases, mobile, monetization, notifications, UX
- [`LANDLORD_BILLING_APP_ARCHITECTURE_MVP.md`](./LANDLORD_BILLING_APP_ARCHITECTURE_MVP.md) — product spec, data model, business rules, and implementation status
