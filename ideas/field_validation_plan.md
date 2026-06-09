# Field Validation Plan — Zod Migration

## Goal

Replace ad-hoc inline validation in server actions with Zod schemas defined centrally in `src/lib/validation.ts`. This gives us type-safe parsing, consistent error messages, and protection against malformed input at every system boundary.

## Current State

`src/lib/validation.ts` has 5 hand-rolled helpers:
- `parseValidDate` — returns `Date | null`
- `parseRentDueDay` — clamps 1–31
- `parseUtilityType` — enum check
- `parsePercentage` — clamps 0–100
- `MAX_XLSX_UPLOAD_BYTES` — file size constant

Money parsing lives in `src/lib/money.ts` (`parseMoneyToCents`). Auth actions do inline checks. All other actions validate ad-hoc inline.

No form-level error feedback exists today — failures redirect with `?error=…` only.

## Approach

1. Install Zod (`npm install zod`)
2. Define reusable field schemas in `src/lib/validation.ts` (replace the current helpers)
3. Define one schema per server action form; parse with `schema.safeParse()`
4. Return structured field errors so the UI can show inline messages (instead of only redirect-based errors)
5. Roll out feature area by feature area — auth first (highest risk), then core data entry

## Shared Zod Primitives (go in `src/lib/validation.ts`)

```ts
// Non-empty string
z.string().trim().min(1)

// Optional string (kept as undefined when blank)
z.string().trim().optional()

// Email
z.string().trim().email()

// Password
z.string().min(6, "Password must be at least 6 characters")

// Dollar amount → cents (reuse parseMoneyToCents internally)
z.string().transform(parseMoneyToCents).pipe(z.number().int().min(0))

// Date string → Date
z.string().trim().transform((v, ctx) => {
  const d = parseValidDate(v);
  if (!d) ctx.addIssue({ code: "custom", message: "Invalid date" });
  return d ?? new Date();
})

// Rent due day (1–31)
z.coerce.number().int().min(1).max(31)

// Utility type enum
z.enum(["gas", "water", "electricity", "internet", "other"])

// Percentage (0–100)
z.coerce.number().min(0).max(100)

// Checkbox (HTML sends "on" or nothing)
z.literal("on").optional().transform(v => v === "on")

// File (FormData File object)
z.instanceof(File).refine(f => f.size > 0, "File is required")
```

---

## Feature Area Schemas

### 1. Authentication

**Priority: High** — public-facing, most sensitive

#### Sign In
```
email:    required email string
password: required string (no min — let bcrypt fail for wrong password)
next:     optional string, must start with "/" and not "//"
```

#### Sign Up
```
email:    required email string
password: required string, min 6 chars
name:     optional string
```

**Validation gaps to fix:**
- `next` redirect URL is currently validated inline — move to schema and reject absolute URLs

---

### 2. Properties

#### Create / Update Property
```
name:         required string
addressLine1: required string
city:         required string
province:     optional string, max 2 chars (province code)
postalCode:   optional string, regex /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/ (Canadian format)
```

#### Update Property Finances
```
annualPropertyTax:       optional cents (dollars string → integer)
annualInsurancePremium:  optional cents
mortgageInterestAnnual:  optional cents
taxRollNumber:           optional string
insuranceProvider:       optional string
```

#### Delete Property (confirmation)
```
confirm: required string — validated in action that it equals property name
```

**Validation gaps to fix:**
- `postalCode` has no format check today

---

### 3. Units

#### Create / Update Unit
```
name:        required string
rentAmount:  required cents, min 0
rentDueDay:  optional integer 1–31, default 1
```

---

### 4. Tenants

#### Create Tenant (Onboard)
```
firstName:       required string
lastName:        required string
email:           optional email string
phone:           optional string, loose format (no strict regex — international numbers vary)
moveInDate:      optional date string → Date, default today
sendWelcomeEmail: checkbox boolean
```

**Validation gaps to fix:**
- `email` field is `type="email"` in the browser but not validated server-side — add Zod email check

#### Update Tenant
```
firstName: required string
lastName:  required string
email:     optional email string
phone:     optional string
```

#### Move Out Tenant
```
moveOutDate: required date string → Date
```

---

### 5. Leases

#### Generate Lease / Standard Lease (Form 2229E)
```
leaseStartDate:         required date
leaseEndDate:           optional date, must be after leaseStartDate if provided
securityDeposit:        optional cents
lastMonthRentDeposit:   checkbox boolean
partialRent:            optional cents
partialRentStartDate:   optional date
partialRentEndDate:     optional date, must be after partialRentStartDate if provided
rentDeposit:            optional cents
keyDeposit:             optional cents
petsAllowed:            z.enum(["yes", "no", "with_permission"])
smokingAllowed:         checkbox boolean
parkingIncluded:        checkbox boolean
additionalTerms:        optional string
rentPaymentMethod:      optional string
servicesIncluded:       optional array of strings
utilitiesTenantPays:    optional array of strings
utilitiesLandlordPays:  optional array of strings
```

**Validation gaps to fix:**
- No check that `leaseEndDate > leaseStartDate` today

---

### 6. Utility Bills

#### Create Utility Bill (Manual)
```
utilityType:          required utility enum
providerName:         optional string
amount:               required cents, min 1
billingPeriodStart:   required date
billingPeriodEnd:     required date, must be after billingPeriodStart
dueDate:              optional date
file:                 optional File
```

**Validation gaps to fix:**
- No check that `billingPeriodEnd >= billingPeriodStart`

#### Import Utility Bills (XLSX)
```
utilityType: required utility enum
file:        required File, max 10 MB, must be .xlsx
billMonth:   optional integer 1–12
billYear:    optional integer >= 2000
confirmed:   optional literal "true"
```

#### Save Utility Rules
For each utility type (`gas | water | electricity | internet | other`):
```
{type}_tenantPays:      checkbox boolean
{type}_includedInRent:  checkbox boolean
{type}_percentage:      optional number 0–100
```

---

### 7. Statements & Payments

#### Generate Statements
```
propertyId: required string
month:      required integer 1–12
year:       required integer >= 2000
unitIds:    required array of strings, min 1
```

#### Create Past Statement
```
unitId:        required string
month:         required integer 1–12
year:          required integer >= 2000
paymentStatus: z.enum(["unpaid", "paid", "partial"])
paymentMethod: optional z.enum(["e_transfer", "cash", "cheque", "bank_deposit", "other"])
paymentDate:   optional date
partialAmount: optional cents (required when paymentStatus === "partial")
```

#### Record Statement Payment
```
paymentType:    z.enum(["full", "partial"])
amount:         optional cents (required when paymentType === "partial")
paymentDate:    required date
paymentMethod:  z.enum(["e_transfer", "cash", "cheque", "bank_deposit", "stripe", "other"])
referenceNumber: optional string
```

**Validation gaps to fix:**
- `partialAmount` / `amount` conditionality currently checked inline — use Zod `.superRefine()` or `.refine()` for cross-field rules

---

### 8. Settings

#### Update Settings
```
landlordName:        required string
paymentInstructions: optional string
statementNotes:      optional string
autoSendStatements:  checkbox boolean
autoSendDayOfMonth:  integer 1–28
leaseReminderDays:   integer 7–365
stripePaymentsEnabled: checkbox boolean
```

#### Update Profile
```
name: optional string
```

---

### 9. Maintenance

#### Create Maintenance Record
```
propertyId:  required string
unitId:      optional string
title:       required string
category:    z.enum(["plumbing", "electrical", "hvac", "appliance", "general_repair", "other"])
status:      z.enum(["planned", "in_progress", "completed", "cancelled"])
vendorName:  optional string
cost:        optional cents
description: optional string
file:        optional File
```

---

### 10. Communications

#### Send Announcement Email
```
subject:    required string, min 1
message:    required string, min 1
propertyId: optional string
tenantIds:  required array of strings, min 1
```

#### Send LTB Notice
```
propertyId:       required string
unitId:           required string
tenantId:         required string
formCode:         required string, uppercase, validated against LTB form catalogue
serviceDate:      required date
terminationDate:  optional date
effectiveDate:    optional date
notes:            optional string
[dynamicFields]:  validated per-form via getLtbNoticeWizardFields()
```

---

## Implementation Phases

### Phase 1 — Foundation (1–2 days)
- [ ] `npm install zod`
- [ ] Rewrite `src/lib/validation.ts` to export Zod primitives alongside the existing helpers (keep helpers as thin wrappers initially so nothing breaks)
- [ ] Add a `parseFormData(schema, formData)` utility that returns `{ data, errors }` so actions can use a consistent error-return pattern

### Phase 2 — Auth (1 day)
- [ ] `signInAction` — schema + inline field errors
- [ ] `signUpAction` — schema + inline field errors
- [ ] Update sign-in and sign-up pages to display field-level errors

### Phase 3 — Core data entry (3–4 days)
- [ ] Properties (create, update finances)
- [ ] Units (create, update)
- [ ] Tenants (create, update, move-out)
- [ ] Leases (generate, standard lease)

### Phase 4 — Billing & payments (2–3 days)
- [ ] Utility bills (manual create, XLSX import, save rules)
- [ ] Statements (generate, past, record payment)

### Phase 5 — Everything else (2 days)
- [ ] Maintenance
- [ ] Communications (announcements, LTB notices)
- [ ] Settings & profile
- [ ] Documents & file uploads

---

## Error Display Pattern

Today: validation failures redirect with `?error=generic+message`.

Goal: server actions return structured errors; forms display them inline under each field.

```ts
// server action return type
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string[]> };
```

For progressive enhancement keep the redirect fallback. Add inline error display via `useActionState` (React 19) when fields have errors.

---

## Security Notes

- All validation happens server-side; browser validation is UX only
- Money fields: reject NaN, Infinity, negative values, and values over a reasonable cap (e.g. $10M/year for property tax)
- File uploads: validate MIME type server-side (not just extension) using a library like `file-type` — currently only size is checked
- Redirect `next` parameter: reject any value that doesn't start with `/` or starts with `//` (open redirect)
- Date fields: reject dates far in the future (e.g. > 50 years out) or before 1900 to prevent garbage data
