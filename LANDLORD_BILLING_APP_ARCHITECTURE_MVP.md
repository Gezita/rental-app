# Landlord Billing & Document Management App — MVP Architecture

## 1. Product Summary

The app helps small landlords manage rental units, tenant information, lease documents, utility bills, monthly tenant statements, receipts, and maintenance records.

The MVP should focus on one strong use case:

> A landlord can set up properties and units, define rent and utility-split rules, upload utility bills, auto-generate monthly tenant statements, send them to tenants, record payments, generate receipts, and keep all documents organized by property and unit.

This app is designed for small landlords managing 1–20 units, especially duplexes, triplexes, basement apartments, and small rental portfolios where utilities are often shared between units.

---

## 2. MVP Goals

### Primary Goals

1. Let landlords create properties and units.
2. Let landlords add tenants to units.
3. Let landlords define rent, due dates, discounts, and utility responsibility rules.
4. Let landlords upload utility bills and assign/split them between units.
5. Auto-generate monthly tenant statements.
6. Store all generated statements, receipts, leases, utility bills, and maintenance documents.
7. Track maintenance expenses and invoices.
8. Allow landlords to send tenant statements by email.
9. Allow landlords to mark statements as paid and generate receipts.

### Out of Scope for MVP

The MVP should avoid these features initially:

- Online rent collection/payment processing.
- Tenant screening.
- Credit checks.
- Full accounting/bookkeeping system.
- Tax filing automation.
- E-signature lease workflow.
- Tenant portal.
- Mobile app.
- AI/OCR bill reading.
- Multi-user teams and roles.
- Advanced reporting.

These can be added later after the core billing/document workflow is validated.

---

## 3. Recommended Tech Stack

The developer can adjust based on preference, but this stack is recommended for speed, maintainability, and MVP scalability.

### Frontend

- **Framework:** Next.js with App Router
- **Language:** TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Forms:** React Hook Form + Zod
- **State Management:** Server components where possible; TanStack Query for client-side async state if needed
- **Tables:** TanStack Table
- **PDF Preview:** Browser-native PDF viewer or react-pdf later

### Backend

Option A — Recommended for fast MVP:

- **Runtime:** Next.js API routes / server actions
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Auth:** Clerk, Supabase Auth, or Auth.js
- **File Storage:** S3-compatible storage, Supabase Storage, or Cloudflare R2
- **Email:** Resend, Postmark, or SendGrid
- **PDF Generation:** React PDF, Playwright HTML-to-PDF, or server-side PDF service

Option B — More scalable split backend:

- **Frontend:** Next.js
- **Backend:** NestJS or FastAPI
- **Database:** PostgreSQL
- **File Storage:** S3/R2/Supabase Storage
- **Queue:** BullMQ/Redis for email and PDF jobs

For MVP, Option A is simpler and faster.

---

## 4. Core App Modules

```text
App
├── Authentication
├── Dashboard
├── Properties
├── Units
├── Tenants
├── Utility Bills
├── Utility Rules
├── Monthly Statements
├── Payments & Receipts
├── Documents
├── Maintenance
├── Email Sending
├── PDF Generation
└── Settings
```

---

## 5. User Roles

For MVP, only one role is required.

### Landlord / Owner

Can:

- Create and edit properties.
- Create and edit units.
- Add tenant information.
- Upload documents.
- Create utility rules.
- Upload bills.
- Generate statements.
- Send statements.
- Mark statements as paid.
- Generate receipts.
- Add maintenance records.

### Future Roles

For later versions:

- Admin
- Property manager
- Accountant/read-only user
- Tenant portal user

---

## 6. Information Architecture

```text
Dashboard
├── Portfolio summary
├── Monthly statement status
├── Missing utility bills
├── Overdue statements
├── Recent documents
└── Maintenance reminders

Properties
├── Property list
└── Property detail
    ├── Overview
    ├── Units
    │   └── Unit detail
    │       ├── Overview
    │       ├── Tenant
    │       ├── Rent settings
    │       ├── Utility rules
    │       ├── Statements
    │       ├── Documents
    │       └── Maintenance
    ├── Utility bills
    ├── Documents
    └── Maintenance

Statements
├── Generate monthly statements
├── Draft statements
├── Sent statements
├── Paid statements
├── Overdue statements
└── Receipts

Documents
├── All documents
├── Leases
├── Utility bills
├── Statements
├── Receipts
├── Maintenance invoices
├── Notices
└── Other

Maintenance
├── All maintenance
├── Open
├── In progress
├── Completed
└── Vendors

Settings
├── Account
├── Email template
├── Statement template
├── Utility categories
└── Payment instructions
```

---

## 7. Main User Flows

### 7.1 First-Time Setup Flow

```text
Sign up
→ Create property
→ Add property address
→ Add first unit
→ Add rent amount and due date
→ Add tenant info
→ Upload lease
→ Set utility rules
→ Land on unit dashboard
```

### 7.2 Upload Utility Bill Flow

```text
Dashboard or Property Detail
→ Upload utility bill
→ Select property
→ Select utility type
→ Enter provider, amount, billing period, due date
→ Upload PDF/image
→ App applies utility split rules
→ User reviews split preview
→ Save bill
→ Bill is stored in documents
→ Bill becomes available for next statement run
```

### 7.3 Generate Monthly Statement Flow

```text
Statements
→ Generate monthly statements
→ Select month and property
→ App pulls active units, rent, utilities, discounts, previous balances
→ App creates draft statements
→ Landlord reviews each statement
→ Landlord edits if needed
→ Landlord sends selected statements
→ App stores sent PDFs in documents
```

### 7.4 Payment and Receipt Flow

```text
Open sent statement
→ Mark as paid
→ Enter payment date
→ Enter payment method
→ Add reference/note
→ Generate receipt
→ Send receipt to tenant if needed
→ Store receipt in documents
```

### 7.5 Maintenance Flow

```text
Maintenance
→ Add maintenance item
→ Select property and optional unit
→ Enter category, date, vendor, cost, status
→ Upload invoice/photos
→ Save
→ Record appears in property/unit maintenance history
→ Invoice appears in documents
```

---

## 8. Core Database Models

The following models can be implemented with Prisma or any ORM.

### 8.1 User

```ts
type User = {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### 8.2 Property

```ts
type Property = {
  id: string;
  userId: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### 8.3 Unit

```ts
type Unit = {
  id: string;
  propertyId: string;
  name: string; // Example: Main Floor, Basement, Unit 1
  rentAmountCents: number;
  rentDueDay: number; // 1-31
  activeTenantId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### 8.4 Tenant

```ts
type Tenant = {
  id: string;
  unitId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  moveInDate?: Date;
  moveOutDate?: Date;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### 8.5 Lease

```ts
type Lease = {
  id: string;
  unitId: string;
  tenantId: string;
  documentId?: string;
  leaseStartDate: Date;
  leaseEndDate?: Date;
  rentAmountCents: number;
  rentDueDay: number;
  status: 'active' | 'expired' | 'terminated' | 'draft';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### 8.6 UtilityRule

These are the default monthly utility rules for each unit.

```ts
type UtilityRule = {
  id: string;
  unitId: string;
  utilityType: 'gas' | 'water' | 'electricity' | 'internet' | 'other';
  tenantPays: boolean;
  percentage: number; // Example: 40 means 40%
  includedInRent: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### 8.7 UtilityBill

```ts
type UtilityBill = {
  id: string;
  propertyId: string;
  utilityType: 'gas' | 'water' | 'electricity' | 'internet' | 'other';
  providerName?: string;
  amountCents: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate?: Date;
  documentId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### 8.8 UtilityBillSplit

Stores calculated or manually overridden split amounts.

```ts
type UtilityBillSplit = {
  id: string;
  utilityBillId: string;
  unitId: string;
  percentage: number;
  amountCents: number;
  isOverride: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### 8.9 Statement

A statement is a monthly bill/payment request. It is not a receipt until payment is recorded.

```ts
type Statement = {
  id: string;
  unitId: string;
  tenantId: string;
  statementNumber: string;
  statementMonth: number; // 1-12
  statementYear: number;
  issueDate: Date;
  dueDate: Date;
  rentAmountCents: number;
  utilityTotalCents: number;
  discountTotalCents: number;
  adjustmentTotalCents: number;
  previousBalanceCents: number;
  totalDueCents: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  pdfDocumentId?: string;
  emailSentAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### 8.10 StatementLineItem

```ts
type StatementLineItem = {
  id: string;
  statementId: string;
  type: 'rent' | 'utility' | 'discount' | 'adjustment' | 'previous_balance' | 'other';
  description: string;
  amountCents: number;
  sourceUtilityBillId?: string;
  sourceDocumentId?: string;
  calculationNote?: string; // Example: "$180 gas bill × 40%"
  createdAt: Date;
  updatedAt: Date;
};
```

### 8.11 Payment

```ts
type Payment = {
  id: string;
  statementId: string;
  amountCents: number;
  paymentDate: Date;
  paymentMethod: 'e_transfer' | 'cash' | 'cheque' | 'bank_deposit' | 'other';
  referenceNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### 8.12 Receipt

```ts
type Receipt = {
  id: string;
  paymentId: string;
  receiptNumber: string;
  issueDate: Date;
  pdfDocumentId?: string;
  emailSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
```

### 8.13 Document

```ts
type Document = {
  id: string;
  userId: string;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  category:
    | 'lease'
    | 'utility_bill'
    | 'statement'
    | 'receipt'
    | 'maintenance_invoice'
    | 'notice'
    | 'photo'
    | 'other';
  fileName: string;
  fileUrl: string;
  fileMimeType: string;
  fileSizeBytes: number;
  tags?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### 8.14 MaintenanceRecord

```ts
type MaintenanceRecord = {
  id: string;
  propertyId: string;
  unitId?: string;
  category:
    | 'plumbing'
    | 'electrical'
    | 'hvac'
    | 'appliance'
    | 'roof'
    | 'pest_control'
    | 'cleaning'
    | 'general_repair'
    | 'other';
  title: string;
  description?: string;
  vendorName?: string;
  costCents?: number;
  maintenanceDate?: Date;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  invoiceDocumentId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

---

## 9. Database Relationship Summary

```text
User 1 ── many Properties
User 1 ── many Documents

Property 1 ── many Units
Property 1 ── many UtilityBills
Property 1 ── many Documents
Property 1 ── many MaintenanceRecords

Unit 1 ── many Tenants
Unit 1 ── many UtilityRules
Unit 1 ── many Statements
Unit 1 ── many Documents
Unit 1 ── many MaintenanceRecords

Tenant 1 ── many Statements
Tenant 1 ── many Documents

UtilityBill 1 ── many UtilityBillSplits
UtilityBill 1 ── many StatementLineItems

Statement 1 ── many StatementLineItems
Statement 1 ── many Payments
Payment 1 ── one Receipt

Document can optionally belong to:
- Property
- Unit
- Tenant
- UtilityBill
- Statement
- Receipt
- MaintenanceRecord
```

---

## 10. Recommended API Routes

These routes assume a REST-style API. If using Next.js server actions, these can be converted into server actions.

### Auth

```http
GET    /api/me
```

### Properties

```http
GET    /api/properties
POST   /api/properties
GET    /api/properties/:propertyId
PATCH  /api/properties/:propertyId
DELETE /api/properties/:propertyId
```

### Units

```http
GET    /api/properties/:propertyId/units
POST   /api/properties/:propertyId/units
GET    /api/units/:unitId
PATCH  /api/units/:unitId
DELETE /api/units/:unitId
```

### Tenants

```http
GET    /api/units/:unitId/tenants
POST   /api/units/:unitId/tenants
GET    /api/tenants/:tenantId
PATCH  /api/tenants/:tenantId
DELETE /api/tenants/:tenantId
```

### Utility Rules

```http
GET    /api/units/:unitId/utility-rules
POST   /api/units/:unitId/utility-rules
PATCH  /api/utility-rules/:utilityRuleId
DELETE /api/utility-rules/:utilityRuleId
```

### Utility Bills

```http
GET    /api/properties/:propertyId/utility-bills
POST   /api/properties/:propertyId/utility-bills
GET    /api/utility-bills/:utilityBillId
PATCH  /api/utility-bills/:utilityBillId
DELETE /api/utility-bills/:utilityBillId
POST   /api/utility-bills/:utilityBillId/calculate-splits
```

### Statements

```http
GET    /api/statements
POST   /api/statements/generate
GET    /api/statements/:statementId
PATCH  /api/statements/:statementId
POST   /api/statements/:statementId/send
POST   /api/statements/:statementId/mark-paid
POST   /api/statements/:statementId/generate-pdf
DELETE /api/statements/:statementId
```

### Payments and Receipts

```http
GET    /api/statements/:statementId/payments
POST   /api/statements/:statementId/payments
POST   /api/payments/:paymentId/generate-receipt
POST   /api/receipts/:receiptId/send
GET    /api/receipts/:receiptId
```

### Documents

```http
GET    /api/documents
POST   /api/documents/upload
GET    /api/documents/:documentId
PATCH  /api/documents/:documentId
DELETE /api/documents/:documentId
```

### Maintenance

```http
GET    /api/maintenance
POST   /api/maintenance
GET    /api/maintenance/:maintenanceId
PATCH  /api/maintenance/:maintenanceId
DELETE /api/maintenance/:maintenanceId
```

### Settings

```http
GET    /api/settings
PATCH  /api/settings
```

---

## 11. Statement Generation Logic

### Inputs

For a given month and property:

- Active units
- Active tenants
- Rent amount
- Rent due date
- Utility bills for the selected billing period
- Utility split rules
- Discounts
- Previous unpaid balances
- Manual adjustments

### Statement Generation Algorithm

```text
For each active unit in selected property:
  Find active tenant
  Create draft statement
  Add rent line item
  Find utility bills for selected month/property
  For each bill:
    Find utility split for this unit
    If split exists:
      Add utility line item
      Link source utility bill and document
  Add discounts if configured
  Add previous balance if any
  Calculate total due
  Save as draft
```

### Utility Split Calculation

```text
unitUtilityAmount = utilityBillTotalAmount * unitUtilityPercentage / 100
```

Example:

```text
Gas bill: $180
Basement utility rule: 40%
Basement charge: $180 × 40% = $72
```

### Validation Rules

- Statement cannot be sent if tenant email is missing.
- Statement cannot be sent if total due is negative, unless manually approved.
- Statement should warn if utility bill has no uploaded proof document.
- Statement should warn if unit has no active tenant.
- Utility split should warn if percentages exceed 100% across units.
- Utility split should allow landlord-paid remainder if percentages total less than 100%.

---

## 12. Document Storage Rules

Every uploaded or generated document should be categorized and attached to the correct object.

### Utility Bill Upload

When landlord uploads a utility bill:

```text
Category: utility_bill
Attached to: property
Optionally linked to: units through UtilityBillSplit
```

Suggested virtual path:

```text
/properties/{propertyId}/utility-bills/{year}/{month}/{utilityType}-{provider}.pdf
```

### Statement PDF

When a statement PDF is generated:

```text
Category: statement
Attached to: property, unit, tenant, statement
```

Suggested virtual path:

```text
/properties/{propertyId}/units/{unitId}/statements/{year}-{month}-statement.pdf
```

### Receipt PDF

When a receipt is generated:

```text
Category: receipt
Attached to: property, unit, tenant, payment, receipt
```

Suggested virtual path:

```text
/properties/{propertyId}/units/{unitId}/receipts/{year}-{month}-receipt.pdf
```

### Lease Upload

```text
Category: lease
Attached to: property, unit, tenant, lease
```

Suggested virtual path:

```text
/properties/{propertyId}/units/{unitId}/lease/active-lease.pdf
```

### Maintenance Invoice Upload

```text
Category: maintenance_invoice
Attached to: property and optional unit
Linked to: MaintenanceRecord
```

Suggested virtual path:

```text
/properties/{propertyId}/maintenance/{year}/{maintenanceId}-invoice.pdf
```

---

## 13. Frontend Page Structure

Recommended Next.js App Router structure:

```text
app/
├── (auth)/
│   ├── sign-in/
│   └── sign-up/
├── (dashboard)/
│   ├── layout.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── properties/
│   │   ├── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [propertyId]/
│   │       ├── page.tsx
│   │       ├── units/
│   │       │   ├── new/
│   │       │   │   └── page.tsx
│   │       │   └── [unitId]/
│   │       │       ├── page.tsx
│   │       │       ├── tenant/
│   │       │       ├── utilities/
│   │       │       ├── statements/
│   │       │       ├── documents/
│   │       │       └── maintenance/
│   │       ├── utility-bills/
│   │       ├── documents/
│   │       └── maintenance/
│   ├── statements/
│   │   ├── page.tsx
│   │   ├── generate/
│   │   │   └── page.tsx
│   │   └── [statementId]/
│   │       └── page.tsx
│   ├── documents/
│   │   └── page.tsx
│   ├── maintenance/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx
└── api/
    └── ...
```

---

## 14. Suggested Project Folder Structure

```text
src/
├── app/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── properties/
│   ├── units/
│   ├── tenants/
│   ├── utilities/
│   ├── statements/
│   ├── documents/
│   └── maintenance/
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── email.ts
│   ├── files.ts
│   ├── money.ts
│   ├── pdf.ts
│   ├── validators.ts
│   └── permissions.ts
├── server/
│   ├── services/
│   │   ├── property.service.ts
│   │   ├── unit.service.ts
│   │   ├── tenant.service.ts
│   │   ├── utility-bill.service.ts
│   │   ├── statement.service.ts
│   │   ├── document.service.ts
│   │   ├── maintenance.service.ts
│   │   └── email.service.ts
│   └── repositories/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── emails/
│   ├── statement-email.tsx
│   └── receipt-email.tsx
├── pdf-templates/
│   ├── statement-template.tsx
│   └── receipt-template.tsx
└── types/
```

---

## 15. Key UI Screens for MVP

### Dashboard

Must show:

- Total monthly rent expected.
- Draft statements ready for review.
- Missing utility bills.
- Overdue statements.
- Recent documents.
- Open maintenance items.

### Property List

Must show:

- Property name/address.
- Number of units.
- Monthly rent total.
- Open balances.
- Quick action: Add bill, Generate statement.

### Property Detail

Must show:

- Property summary.
- Units list.
- Utility bills.
- Documents.
- Maintenance.

### Unit Detail

Must show:

- Tenant name.
- Rent amount.
- Due date.
- Lease status.
- Utility rules.
- Last statement.
- Current balance.
- Documents.
- Maintenance records.

### Utility Bill Upload

Must show:

- Utility type.
- Provider.
- Amount.
- Billing period.
- Due date.
- PDF/image upload.
- Split preview by unit.
- Save button.

### Statement Generator

Must show:

- Month/year selection.
- Property selection.
- Draft statement table.
- Rent total.
- Utility total.
- Discounts.
- Total due.
- Status.
- Preview/send actions.

### Statement Detail

Must show:

- Tenant info.
- Statement line items.
- Linked proof documents.
- Total due.
- Status.
- Send button.
- Download PDF button.
- Mark as paid button.

### Documents

Must show:

- Search.
- Filters by property, unit, category, date.
- Document table/list.
- Upload button.

### Maintenance

Must show:

- Maintenance records.
- Status.
- Cost.
- Property/unit.
- Invoice attachment.
- Add maintenance button.

---

## 16. Email Templates

### Monthly Statement Email

```text
Subject: {Month} {Year} Statement for {UnitName}

Hi {TenantName},

Your monthly statement for {Month} {Year} is ready.

Total due: {TotalDue}
Due date: {DueDate}

The statement PDF is attached and includes rent, utility charges, discounts, and supporting bill details where applicable.

Payment instructions:
{PaymentInstructions}

Thank you,
{LandlordName}
```

### Receipt Email

```text
Subject: Rent Receipt for {Month} {Year}

Hi {TenantName},

Thank you. Your payment of {PaymentAmount} was recorded on {PaymentDate}.

Your receipt is attached for your records.

Thank you,
{LandlordName}
```

---

## 17. PDF Templates

### Statement PDF Must Include

- Landlord/business name.
- Property address.
- Unit name.
- Tenant name.
- Statement number.
- Statement month.
- Issue date.
- Due date.
- Line items:
  - Rent
  - Utility charges
  - Discounts
  - Adjustments
  - Previous balance
- Total due.
- Payment instructions.
- Notes.
- Supporting document references.

### Receipt PDF Must Include

- Receipt number.
- Tenant name.
- Property address.
- Unit name.
- Payment amount.
- Payment date.
- Payment method.
- Statement paid.
- Landlord/business name.
- Notes.

---

## 18. Security and Privacy Requirements

The MVP handles sensitive tenant and landlord documents, so security should be part of the first build.

### Required MVP Security

- Authentication required for all dashboard routes.
- Users can only access their own data.
- File uploads must be private by default.
- Use signed URLs for document access.
- Validate all form inputs with Zod or equivalent.
- Store money as integer cents, not floats.
- Sanitize uploaded file names.
- Restrict file types for upload.
- Set file size limits.
- Log statement send/payment events.
- Never expose internal storage URLs publicly.

### Recommended File Upload Restrictions

Allowed file types:

- PDF
- JPG
- PNG
- HEIC if supported

Suggested MVP max file size:

- 10 MB per file

### Audit Events to Track

```text
property.created
unit.created
tenant.created
document.uploaded
utility_bill.created
statement.generated
statement.sent
statement.marked_paid
receipt.generated
maintenance.created
```

---

## 19. Important UX and Business Rules

### Statement vs Receipt

- A **statement** is generated before payment.
- A **receipt** is generated only after payment is recorded.
- Do not call an unpaid monthly bill a receipt.

### Utility Proof

- Every utility charge should link to the original uploaded bill if available.
- If no bill proof is attached, the app should display a warning before sending.

### Utility Split Rules

- Utility percentages should be saved at the unit level.
- Monthly bills should reuse these percentages automatically.
- Landlord can override a split for a specific bill.
- If total split is under 100%, remaining balance is assumed to be landlord-paid.
- If total split is over 100%, show an error or warning before saving.

### Draft Before Send

- Monthly statements should always be generated as drafts first.
- The landlord must review before sending.

### Money Handling

- Store all monetary values in cents.
- Format money on the frontend only.
- Use consistent currency formatting, default CAD.

---

## 20. MVP Build Phases

### Phase 1 — Foundation

Build:

- Auth
- User account
- Dashboard shell
- Database schema
- Property CRUD
- Unit CRUD
- Tenant CRUD

Deliverable:

> Landlord can create an account, add a property, add units, and add tenants.

---

### Phase 2 — Utility Rules and Documents

Build:

- Utility rule CRUD
- Document upload
- Document list/filter
- Attach documents to property/unit/tenant
- Private file storage

Deliverable:

> Landlord can define utility percentages and upload/store documents.

---

### Phase 3 — Utility Bills and Splits

Build:

- Utility bill upload form
- Utility bill CRUD
- Split calculation logic
- Split preview UI
- Link utility bill to document

Deliverable:

> Landlord can upload a bill and split it between units based on saved rules.

---

### Phase 4 — Statement Generation

Build:

- Statement generation service
- Draft statement creation
- Statement detail page
- Line items
- PDF generation
- Statement document storage

Deliverable:

> Landlord can generate monthly draft statements with rent and utility charges.

---

### Phase 5 — Email, Payment, and Receipt

Build:

- Email sending
- Send statement action
- Mark as paid
- Payment record
- Receipt generation
- Receipt email

Deliverable:

> Landlord can send statements, record payments, and generate receipts.

---

### Phase 6 — Maintenance

Build:

- Maintenance CRUD
- Invoice upload
- Maintenance filters
- Property/unit maintenance history

Deliverable:

> Landlord can track repairs, maintenance costs, and invoices.

---

## 21. Suggested MVP Acceptance Criteria

### Property and Unit Setup

- User can create a property.
- User can add multiple units to a property.
- User can edit rent amount and due date per unit.
- User can add tenant info to a unit.

### Utility Rules

- User can add gas, water, electricity, internet, or other utility rules.
- User can define tenant-paid percentage per utility.
- User can mark a utility as included in rent.

### Utility Bills

- User can upload a bill PDF/image.
- User can enter bill amount and billing period.
- App calculates split amount per unit.
- User can override a split.
- Bill is saved as a document.

### Statements

- User can generate statements for a selected month.
- Statement includes rent.
- Statement includes utility split line items.
- Statement includes discounts/adjustments if entered.
- Statement shows total due.
- Statement starts as draft.
- User can send statement by email.
- Statement PDF is stored in documents.

### Payments and Receipts

- User can mark statement as paid.
- User can record payment method/date/reference.
- App generates receipt PDF.
- Receipt is stored in documents.

### Maintenance

- User can create maintenance record.
- User can attach invoice/photo.
- User can filter maintenance by property/unit/status.

---

## 22. Future V2 Features

After MVP validation, consider:

- OCR for utility bill amount and due date.
- Tenant portal.
- Online rent collection.
- Automatic recurring monthly statement drafts.
- Lease expiry reminders.
- Maintenance reminders.
- CRA/T776-ready reports.
- Accountant export.
- Multi-user/team access.
- Vendor database.
- Mobile app.
- AI document tagging.
- Email inbox integration to auto-import utility bills.

---

## 23. MVP Success Metrics

Track these product metrics:

- Number of properties created.
- Number of units created.
- Number of utility rules created.
- Number of bills uploaded.
- Number of statements generated.
- Number of statements sent.
- Number of payments recorded.
- Number of receipts generated.
- Time from signup to first statement generated.
- Percentage of users who return the next month.

Primary activation event:

> User generates and sends their first monthly statement.

Primary retention event:

> User returns the next month and generates another statement.

---

## 24. Recommended Development Priority

The developer should not start with the dashboard. Start with the data and core workflow.

Recommended order:

1. Database schema.
2. Auth.
3. Property CRUD.
4. Unit CRUD.
5. Tenant CRUD.
6. Utility rules.
7. Document upload.
8. Utility bill upload.
9. Utility bill split calculation.
10. Draft statement generation.
11. Statement PDF.
12. Send statement email.
13. Payment + receipt.
14. Maintenance.
15. Dashboard summary.

This keeps the MVP focused on the core value: accurate monthly tenant billing with organized supporting documents.
