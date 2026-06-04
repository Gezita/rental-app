# Rentals Dashboard

Landlord billing and document management MVP.

## Quick Start

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo account:** `demo@landlord.app` / `demo1234`

## Features

- Properties, units, and tenants
- Utility split rules per unit
- Utility bill upload with automatic split calculation
- Monthly statement generation (draft → send → paid → receipt)
- **Partial payments** on statements with receipt generation and balance tracking
- **Maintenance receipt repository** for invoices and vendor receipts
- **LTB N-series notices** — download official Ontario forms, upload, and email tenants
- **Tenant announcements** with professional HTML email layout
- **Auto-send statements** on the 1st of each month (configurable in Settings)
- **Lease end reminders** on dashboard (set lease end date when uploading a lease)
- **Automatic invoice sender** (monthly generate + email; cron or manual run from Settings)
- **Stripe tenant payments** via `/pay/[token]` link in statement emails
- **Green Button utility sync** — connect Enbridge, Alectra, or sandbox accounts to import bills automatically
- Document storage (local `uploads/` folder for dev)
- Maintenance tracking with invoice uploads
- Dashboard summary

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Prisma + SQLite (local dev)
- Tailwind CSS
- pdf-lib for PDF generation
- Emails logged to console in dev mode
- PWA-ready (manifest, service worker, iOS home screen support)

## Project structure

```
src/app/actions/     Domain server actions (properties, statements, settings, …)
src/lib/             Business logic, auth, ownership helpers
src/components/      UI and layout
src/middleware.ts    Route protection for authenticated areas
public/sw.js         Service worker for offline shell
```

Set `SESSION_SECRET` in `.env` for signed session cookies (required in production).

## Workflow

1. Sign up or use demo account
2. Create a property and add units
3. Add tenants and set utility rules
4. Upload utility bills
5. Generate monthly statements
6. Send statements (check terminal for email output)
7. Tenants pay via Stripe link (optional) or landlord marks as paid
8. Receipts generated automatically

## Stripe setup

1. Copy `.env.example` to `.env` and set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`
2. In [Stripe Dashboard](https://dashboard.stripe.com), add webhook endpoint: `{APP_URL}/api/stripe/webhook` — event: `checkout.session.completed`
3. Enable **Stripe card payments** in Settings

## Automatic statements (cron)

Set `CRON_SECRET` in `.env`, enable auto-send in Settings, then schedule:

```bash
curl -X POST http://localhost:3000/api/cron/auto-billing \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or use **Run auto-billing now** on the Settings page to test.

## Green Button utility sync

Import gas (Enbridge) and electricity (Alectra) bills via the Ontario **Green Button Connect My Data** standard.

### Quick test (sandbox)

1. Ensure `NEXT_PUBLIC_APP_URL` matches your dev server (default `http://localhost:3000`)
2. Sandbox credentials are pre-filled in `.env.example` (`third_party` / `secret`)
3. On a property page, open **Green Button** → **Connect Green Button Sandbox**
4. Authorize in the sandbox portal, then use **Sync now** to import bills

**Local dev tip:** OAuth requires registering `{APP_URL}/api/green-button/callback` with the data custodian. Use **Sandbox manual connect** on the Green Button page with a test token from the [API sandbox docs](http://greenbuttonalliance.github.io/OpenESPI-GreenButton-API-Documentation/API/) (token for alan, Subscription ID `5`).

For production Enbridge/Alectra, you must register as a third-party provider with each utility and add credentials to `.env`:

- Enbridge: [Share My Data](https://www.enbridgegas.com)
- Alectra: [Green Button](https://alectrautilities.com/green-button)

OAuth callback URL (register this with each utility):

```
{NEXT_PUBLIC_APP_URL}/api/green-button/callback
```

### Scheduled sync

Enable **Utility automation** in Settings, connect accounts per property, then schedule:

```bash
curl -X POST http://localhost:3000/api/cron/green-button-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or use **Sync Green Button bills now** on the Settings page.

## Install on iOS (Add to Home Screen)

This app is configured as a Progressive Web App (PWA) for iPhone and iPad.

1. Deploy the app over **HTTPS** (required for install and service worker)
2. Set `NEXT_PUBLIC_APP_URL` to your production URL
3. Set a strong `SESSION_SECRET` in production
4. On iPhone/iPad, open the site in **Safari**
5. Tap **Share** → **Add to Home Screen**
6. Launch **Rentals** from your home screen — it opens full-screen like a native app

**Notes:**
- Offline support caches static assets and shows an offline page when disconnected
- For App Store distribution, wrap this PWA with [Capacitor](https://capacitorjs.com) in a future phase
