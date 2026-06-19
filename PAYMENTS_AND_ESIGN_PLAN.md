# Payments & E-Signature — Making Setup Easy and Getting Tenants to Pay

**Goal:** Turn Stripe and DocuSign from operator-only environment configuration into **one-click, user-friendly features**, so that any landlord can set up online rent collection themselves and tenants can actually pay them.

This plan covers: (1) why the current setup can't work for real users, (2) the Stripe Connect migration that fixes both setup *and* payment routing, (3) the tenant payment experience (ACH, autopay, reminders), and (4) the e-signature path.

---

## 1. The problem with what exists today

### 1.1 Stripe is a single global account

```ts
// src/lib/stripe.ts
new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" });
```

There is **one** Stripe key for the entire app. Consequences:

- **Every tenant payment from every landlord lands in the app operator's Stripe account**, not the landlord's bank. Landlords AA and BB would both be paying into *your* account.
- The only way to "connect Stripe" is to set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as **server environment variables** (see `src/app/(dashboard)/settings/integrations/page.tsx`). A landlord using the hosted app has no access to those — so today **no end user can actually enable payments themselves.**

### 1.2 DocuSign has the same shape

DocuSign requires four operator env vars (`DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_USER_ID`, `DOCUSIGN_PRIVATE_KEY`) and is likewise **one shared account for the whole app**. Same impossibility for end users.

### 1.3 The root cause

Both integrations are built as **operator-level configuration**, not as **per-user features**. "Easy setup" feels hard because there is currently no user-facing setup at all — only developer env vars. The fix for both is the same shape: replace shared keys + env vars with a **one-click "Connect" flow per landlord.**

---

## 2. Stripe Connect — the fix for setup *and* payment routing

**Stripe Connect** is the standard pattern for a platform where many independent users each receive their own money. It simultaneously solves the easy-onboarding UX and the money-routing problem.

### 2.1 What changes conceptually

| | Today | With Connect |
|---|---|---|
| Stripe account | one, shared, operator's | one **connected account per landlord** |
| Setup | paste secret keys into env vars | click **"Connect with Stripe"** |
| Where rent lands | operator's Stripe | **each landlord's own bank** |
| What you store | nothing per-user | landlord's `acct_…` id on `UserSettings` |
| Platform fee | n/a | optional `application_fee_amount` per charge |

Recommended account type: **Stripe Connect Express.** Stripe hosts onboarding (email, bank, ID verification, payout schedule) and gives each landlord a Stripe-managed dashboard — ideal for small landlords who don't want to manage Stripe themselves.

### 2.2 One-click setup UX (replaces the env-var instructions)

On `Settings → Integrations`, replace the "Add `STRIPE_SECRET_KEY`…" copy with:

1. **Status: Not connected** → button **"Connect with Stripe"**.
2. Click → server creates (or reuses) a Connect Express account and an **Account Link**, redirects the landlord to Stripe's hosted onboarding.
3. Landlord enters their details on Stripe; returns to a `return_url` in the app.
4. Server checks `account.charges_enabled` / `payouts_enabled` and stores the `acct_…` id.
5. **Status: Connected ✓** with their payout bank's last 4 and a **"Manage on Stripe"** link (Express dashboard login link).

No secret keys, no env vars, no developer involvement — the entire current "paste these into your environment" block disappears.

### 2.3 Schema changes (`prisma/schema.prisma`)

Add to `UserSettings` (or a dedicated `PaymentAccount` model if you prefer to keep settings lean):

```prisma
model UserSettings {
  // ...existing...
  stripeConnectAccountId String?   // "acct_..." — the landlord's connected account
  stripeChargesEnabled   Boolean   @default(false) // mirror of account.charges_enabled
  stripePayoutsEnabled   Boolean   @default(false)
  stripeOnboardedAt      DateTime?
  passCardFeesToTenant   Boolean   @default(true)  // who eats the processing fee
  achEnabled             Boolean   @default(true)
  cardEnabled            Boolean   @default(true)
}
```

`stripePaymentsEnabled` (already present) stays as the master on/off toggle; it should only be allowed `true` once `stripeChargesEnabled` is `true`.

### 2.4 Code changes

- **`src/lib/stripe.ts`** — keep one platform `Stripe` client (now the *platform* key, still an env var but operator-only and legitimate). Add helpers:
  - `createConnectAccount(user)` → `accounts.create({ type: "express", … })`
  - `createAccountLink(acctId, returnUrl, refreshUrl)` → onboarding redirect
  - `createLoginLink(acctId)` → Express dashboard "Manage on Stripe"
  - `getAccountStatus(acctId)` → refresh `charges_enabled` / `payouts_enabled`
  - All charge creation now passes `{ stripeAccount: acctId }` (or `transfer_data.destination` + `application_fee_amount` for destination charges).
- **`src/lib/tenant-stripe.ts`** — every Checkout/PaymentIntent creation gains the connected-account context so money routes to the landlord. Add `application_fee_amount` if you take a platform cut.
- **`src/app/actions/integrations.ts`** — add `connectStripeAction` (create account + redirect to Account Link) and `refreshStripeStatusAction`.
- **New webhook handling** — Stripe Connect sends events on `account.updated` (onboarding completed/changed). Handle it to keep `stripeChargesEnabled` current. Use **one platform webhook with Connect events**, not per-landlord webhook secrets — this also removes the per-user `STRIPE_WEBHOOK_SECRET` problem.

### 2.5 Decision: charge model

- **Destination charges** (recommended) — charge is created on the **platform**, funds transferred to the landlord's account, optional platform fee. Simplest webhook/refund handling, keeps you as merchant of record where appropriate.
- **Direct charges** — charge created **on the connected account**; landlord is merchant of record. Lower platform liability but more per-account webhook complexity.

Pick **destination charges** unless tax/merchant-of-record requirements push otherwise.

---

## 3. Getting tenants to actually pay — the payment experience

How competing landlord apps (Avail, Baselane, RentRedi, TenantCloud, Hemlane, Stessa) get reliable on-time rent. Adopt these in priority order.

### 3.1 ACH bank transfer as the default (highest impact)

Cards cost ~2.9% + 30¢ — on $2,000 rent that's ~$58/month, untenable. **ACH Direct Debit costs cents.** Make ACH the default and offer card as a fee-bearing alternative.

- Stripe **ACH Direct Debit** via **Financial Connections** (tenant logs into their bank to link instantly) or micro-deposit verification.
- Default the tenant pay flow to ACH; show card as "pay by card (fee applies)".

### 3.2 Autopay / recurring (biggest retention + on-time driver)

The single feature that makes landlords stay and tenants pay on time.

- Tenant opts in **once**: saves a payment method (ACH mandate) and turns on autopay.
- Rent pulls automatically each cycle. Wire to your existing **`src/lib/auto-billing.ts`** cron and `Statement` generation: when a statement is generated for a unit with autopay on, create the PaymentIntent off the saved method.
- Schema: store a `stripeCustomerId` + `stripePaymentMethodId` and an `autopayEnabled` flag per tenant/lease.
- Always send a "rent will be charged on {date}" pre-notice (required for ACH mandates anyway).

### 3.3 Pass the processing fee to the tenant (configurable)

Let the landlord choose (the `passCardFeesToTenant` flag in §2.3): absorb fees, or pass card fees to the tenant while ACH stays free. Keeps landlords happy because online rent collection costs them ~nothing. Surcharge display must be itemized at checkout.

### 3.4 A real tenant pay experience, not just a link

You already have statement pay links and **tenant auth** (`src/lib/tenant-auth.ts`). Extend toward a lightweight **tenant portal**:

- Tenant logs in → sees current balance, due date, and history → pays → gets receipt.
- Manage autopay and payment method there.
- This already builds on `tenant-payments.ts` actions and `record-payment.ts`.

### 3.5 Reminders + auto receipts (mostly wiring you already have)

- Automated "rent due in 3 days" / "rent is late" emails — you already have scheduling (`auto-billing.ts`) and email content builders (`src/lib/tenant-communications.ts`, `src/server/emails/send.ts`).
- Auto-email receipts on payment — `record-payment.ts` already generates receipts; ensure it emails them.

### 3.6 The end-to-end "it just works" flow

```
Landlord clicks "Connect with Stripe"  →  (Stripe hosted onboarding)  →  Connected ✓
Tenant gets portal invite/pay link  →  links bank (ACH)  →  turns on autopay
Each month: statement generates → rent pulls automatically → receipt auto-sends
Late/overdue → reminder emails fire
```

---

## 4. E-signature — make leases signable with zero setup

### 4.1 Recommended: native in-app signing (no DocuSign account)

For small Ontario landlords, the best product call is to **drop the DocuSign dependency for the common case** and sign in-app:

- You already fill the Ontario Standard Lease PDF (`src/lib/standard-lease-2229e.ts`) and generate PDFs (`src/lib/pdf.ts`).
- Add a browser signing flow: signer types or draws a signature, you stamp it into the PDF at known field positions, store the signed file via `src/lib/storage.ts`, and record signer name + timestamp + IP for an audit trail.
- Landlord and tenant sign with **zero accounts, zero cost, zero configuration.**

This removes the four DocuSign env vars and the shared-account problem entirely for most users.

### 4.2 If you keep DocuSign: switch to OAuth

For landlords who specifically want DocuSign, replace the operator env vars with **DocuSign OAuth (Authorization Code Grant)**:

- "Connect DocuSign" button → landlord authorizes their own DocuSign account → store their tokens.
- Same one-click pattern as Stripe Connect; each landlord's envelopes come from their own account.

Offer native signing as the default and DocuSign as an optional power-user integration.

---

## 5. Build order (suggested)

1. **Stripe Connect onboarding** — schema fields, `connectStripeAction`, Account Link redirect, return/refresh handling, `account.updated` webhook. Updated Integrations UI (Connect button + status). *This alone makes payments route to the right landlord.*
2. **Route existing charges through the connected account** — update `tenant-stripe.ts` / Checkout creation to use `stripeAccount` / destination charges.
3. **ACH Direct Debit** — enable as default payment method in the tenant pay flow.
4. **Tenant portal polish** — balance, history, pay, manage method (builds on existing tenant auth).
5. **Autopay** — save payment method + mandate, wire to `auto-billing.ts`, pre-notice emails.
6. **Fee pass-through toggle** + itemized surcharge display.
7. **Reminders + auto receipts** — finish wiring existing email/cron paths.
8. **Native in-app e-sign** (replaces DocuSign for the common case); optional DocuSign OAuth later.

---

## 6. Decisions to confirm

1. **Charge model** — destination charges (recommended) vs direct charges?
2. **Platform fee** — do you take a per-payment cut (`application_fee_amount`), or is rent collection a flat-subscription feature with no per-txn fee?
3. **Connect account type** — Express (recommended, Stripe-hosted dashboard) vs Standard?
4. **Default fee bearer** — pass card fees to tenants by default, or landlord absorbs?
5. **E-sign** — go native-first (recommended) or keep DocuSign as primary via OAuth?
6. **Merchant of record / tax** — any reason the platform must be MoR (affects §2.5)?

---

## 7. Why this matters

The reason "easy setup" feels impossible today is that Stripe and DocuSign are wired as **operator env vars + single shared accounts** — a deployment configuration, not a product feature. Converting Stripe to **Connect** (one-click onboarding, money to each landlord, ACH + autopay) and leases to **native in-app signing** turns both into things a non-technical landlord can set up in minutes — and makes "tenants actually pay you" a real, reliable flow rather than a manual link.

| | Today (dev-only) | Target (user-friendly) |
|---|---|---|
| **Stripe** | one global secret key; money → operator | **Stripe Connect** button; money → each landlord; ACH + autopay |
| **DocuSign** | four global env vars; one shared account | **native in-app e-sign** (or per-landlord DocuSign OAuth) |
