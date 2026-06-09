# Zigglo UX/UI Improvement & QA Recommendations for Developers

## Purpose of this document

This document converts the UX/UI review into an actionable developer handoff for the Zigglo landlord dashboard app.

The goal is to make the app feel like a premium, easy-to-use, small-landlord workspace instead of a generic admin dashboard. The app should help small Ontario landlords quickly manage:

- Properties and units
- Tenants
- Monthly billing
- Utility bill splits
- Tenant statements
- Documents and receipts
- Maintenance
- Ontario rental paperwork

---

## Product positioning

### Recommended positioning

> Zigglo is the simplest Ontario landlord workspace for small portfolios: monthly billing, utility splits, tenant statements, documents, receipts, and Ontario paperwork.

### What Zigglo should not become

Do not try to copy large property-management platforms like DoorLoop, Buildium, AppFolio, or RentRedi feature-for-feature.

Those platforms are broader and often designed for larger portfolios, property managers, and complex workflows. Zigglo should win by being simpler, faster, more local, and more focused.

### Best target user

Primary user:

- Ontario landlord
- 1 to 20 units
- Manages properties personally
- Needs help organizing rent, bills, documents, and tenant paperwork
- Does not want a complex enterprise property-management system

Secondary user:

- Small renovation/property investor
- Duplex/triplex owner
- Landlord with shared utilities
- Landlord who wants simple tenant billing and records

---

## Main UX problem to fix

The current app is feature-rich, but the information architecture feels too close to a database/admin panel.

The app currently separates many objects into separate top-level pages:

- Properties
- Tenants
- Utility bills
- Inspections
- Statements
- Tax reports
- LTB notices
- Documents
- Maintenance
- Profile
- Integrations
- Settings

This makes the app feel more complex than it needs to be.

The improved UX should organize the app around landlord jobs:

1. Set up portfolio
2. Prepare monthly billing
3. Send tenant statements
4. Track payments
5. Store documents
6. Handle maintenance
7. Stay Ontario-compliant

---

## Recommended navigation structure

### Current issue

The sidebar has too many separate sections. This increases cognitive load and makes the app feel larger and harder to learn.

### Recommended MVP sidebar

Use this simplified navigation:

```text
Home
Properties
Billing
Documents
Maintenance
Settings
```

### Where existing features should move

| Current feature | New location |
|---|---|
| Dashboard | Home |
| Properties | Properties |
| Tenants | Properties > Tenants or Property > Units > Tenant |
| Utility bills | Billing > Utility bills |
| Statements | Billing > Monthly statements |
| Tax reports | Billing > Tax reports |
| LTB notices | Documents > Notices |
| Documents | Documents |
| Maintenance | Maintenance |
| Inspections | Properties or Maintenance |
| Profile | Settings |
| Integrations | Settings |
| Settings | Settings |

### Recommended expanded navigation

For a slightly more detailed version:

```text
Home

Portfolio
- Properties
- Tenants
- Inspections

Billing
- Monthly workflow
- Statements
- Utility bills
- Payments
- Tax reports

Documents
- All files
- Leases
- Notices
- Receipts

Maintenance

Settings
- Profile
- Integrations
- Account
```

### Developer action items

- [ ] Replace current long sidebar with simplified navigation.
- [ ] Move secondary features into grouped sections or page tabs.
- [ ] Keep only the highest-value workflows at top level.
- [ ] Add active states that clearly show the current section.
- [ ] Make mobile navigation mirror the simplified structure.

---

## Recommended app architecture by UX area

## 1. Home dashboard

### Purpose

The dashboard should answer:

> What needs my attention today?

### Recommended dashboard structure

Top hero:

```text
Good morning
June billing is 60% ready

[Generate June statements] [Upload utility bill] [Add property]
```

Primary cards:

```text
Monthly billing
3 utility bills missing
2 draft statements ready
1 overdue tenant

Rent collection
$4,200 collected
$1,700 outstanding
1 partial payment

Documents
2 leases ending soon
4 notices uploaded
12 receipts this year

Maintenance
2 open items
1 in progress
$450 spent this month
```

Next-best-action panel:

```text
Next steps
1. Upload water bill for 424 Vine
2. Review statement for Basement Unit
3. Send June statements
```

### Dashboard recommendations

- Use dashboard as a command center, not just a stats page.
- Put urgent landlord tasks at the top.
- Use clear action buttons.
- Add empty states for new users.
- Show current month billing readiness.
- Show missing data that blocks statement generation.
- Show recent activity.

### Developer action items

- [ ] Add a current-month billing status card.
- [ ] Add a next-best-action component.
- [ ] Add a missing utility bills card.
- [ ] Add outstanding balances card.
- [ ] Add open maintenance card.
- [ ] Add lease ending soon card.
- [ ] Add recent documents/activity card.
- [ ] Make every dashboard card clickable.

---

## 2. Properties section

### Purpose

The Properties section should organize the landlord's portfolio.

### Property card recommendation

Each property card should show:

```text
424 Vine St
2 units · 2 occupied
Monthly rent: $4,000
June billing: Water bill missing

[Open] [Add bill] [Generate statements]
```

### Property detail page

Recommended tabs:

```text
Overview
Units
Bills
Documents
Maintenance
Settings
```

### Property overview should show

- Address
- Number of units
- Occupancy status
- Monthly rent total
- Open maintenance
- Missing utility bills
- Recent statements
- Recent documents
- Quick actions

### Developer action items

- [ ] Add property-level tabs.
- [ ] Add property quick actions.
- [ ] Add property health/status card.
- [ ] Show billing readiness per property.
- [ ] Show unit occupancy status.
- [ ] Show latest documents and maintenance items.
- [ ] Add breadcrumbs on nested property pages.

---

## 3. Unit detail page

### Purpose

The unit page should become one of the most important screens in the app.

### Recommended unit layout

Header:

```text
Basement Unit
$1,700/month · Rent due 1st · Active tenant
```

Tabs:

```text
Overview
Tenant
Lease
Utility splits
Statements
Documents
```

### Unit overview should show

- Rent amount
- Due date
- Active tenant
- Lease start/end
- Utility responsibilities
- Latest statement
- Payment status
- Documents
- Maintenance items

### Developer action items

- [ ] Create a dedicated unit detail layout.
- [ ] Add unit-level tabs.
- [ ] Add a utility split summary.
- [ ] Add latest statement summary.
- [ ] Add tenant contact card.
- [ ] Add lease status card.
- [ ] Add unit documents list.
- [ ] Add unit maintenance list.

---

## 4. Billing section

### Purpose

Billing is the core workflow and should become the strongest product differentiator.

### Recommended Billing tabs

```text
Monthly workflow
Statements
Utility bills
Payments
Tax reports
```

### Monthly workflow page

This should guide landlords through the monthly billing process.

Example:

```text
June 2026 billing

Property: 424 Vine St

Utility bills
✓ Gas uploaded: $142.88
✓ Electricity uploaded: $210.44
Missing: Water

Statements
Blocked: Basement Unit, Main Floor
Reason: Water bill missing

[Upload water bill] [Generate without water] [Save draft]
```

### Monthly billing workflow steps

1. Select month
2. Confirm rent amounts
3. Upload or import utility bills
4. Confirm utility split rules
5. Preview statements
6. Generate drafts
7. Review statements
8. Send to tenants
9. Track payments
10. Generate receipts

### Statement generation requirements

Before generating statements, show a preview table:

| Unit | Rent | Utilities | Prior balance | Discounts | Total | Status |
|---|---:|---:|---:|---:|---:|---|
| Main Unit | $2,300 | $145 | $0 | $0 | $2,445 | Ready |
| Basement | $1,700 | $95 | $0 | $0 | $1,795 | Ready |

### Developer action items

- [ ] Create Billing parent page.
- [ ] Move statements, utility bills, payments, and tax reports under Billing.
- [ ] Build Monthly Workflow tab.
- [ ] Add current-month readiness status.
- [ ] Add statement preview before generation.
- [ ] Add clear draft/review/sent/paid states.
- [ ] Add warning when bills are missing.
- [ ] Add warning when a unit has no utility split rules.
- [ ] Add warning when split percentages do not total 100%.
- [ ] Add warning when tenant has no email.
- [ ] Add duplicate bill detection for same month/property/utility type.
- [ ] Add bulk actions for statements.

---

## 5. Utility bills

### Recommended UX

Utility bills should be part of Billing, not a standalone top-level area.

### Utility bill upload flow

Recommended flow:

1. Choose property
2. Choose billing month
3. Choose utility type
4. Enter total bill amount
5. Upload PDF
6. Preview affected units
7. Preview split amounts
8. Save bill

### Utility split rules

Rename from "Utility rules" to:

> Utility split rules

This is clearer for landlords.

### Utility split rule examples

```text
Main Unit pays:
- 60% water
- 60% gas
- 100% electricity

Basement Unit pays:
- 40% water
- 40% gas
- 0% electricity
```

### Developer action items

- [ ] Rename Utility Rules to Utility Split Rules.
- [ ] Add utility split validation.
- [ ] Add bill upload preview.
- [ ] Add duplicate utility bill prevention.
- [ ] Add PDF preview/download.
- [ ] Add split result preview before saving.
- [ ] Add helper text explaining split rules.
- [ ] Add unit-level utility split summary.

---

## 6. Statements

### Statement UX principles

Statements are sensitive because they involve money. The app should prevent mistakes and make the workflow clear.

### Recommended statement lifecycle

```text
Draft
Ready to send
Sent
Viewed
Partially paid
Paid
Overdue
Cancelled
```

### Statement detail page should include

- Tenant name
- Unit
- Property
- Billing month
- Rent amount
- Utility charges
- Discounts
- Prior balance
- Total due
- Due date
- Payment status
- Attached utility bill references
- Send history
- Receipt history

### Recommended actions

```text
[Preview PDF]
[Send to tenant]
[Record payment]
[Mark as paid]
[Download receipt]
[Cancel statement]
```

### Developer action items

- [ ] Add full statement lifecycle.
- [ ] Add statement preview step.
- [ ] Add statement send confirmation.
- [ ] Add payment history on statement detail.
- [ ] Add receipt generation.
- [ ] Add cancel/void state instead of hard delete.
- [ ] Add audit log for statement actions.

---

## 7. Documents

### Purpose

Documents should feel like a smart landlord filing cabinet.

### Recommended document categories

```text
Leases
Utility bills
Statements
Receipts
LTB notices
Maintenance photos
Maintenance invoices
Other
```

### Document filters

Add filters for:

- Property
- Unit
- Tenant
- Document type
- Month/year
- Date uploaded
- Tags

### Recommended document card

```text
Ontario Standard Lease
424 Vine St · Basement Unit
Tenant: Natalia
Uploaded: Jun 5, 2026
Type: Lease

[View] [Download] [Replace]
```

### Developer action items

- [ ] Convert documents table to responsive cards on mobile.
- [ ] Add document category filters.
- [ ] Add document tags.
- [ ] Add property/unit/tenant association.
- [ ] Add document preview.
- [ ] Add replace document action.
- [ ] Add empty states by document type.
- [ ] Move LTB notices under Documents.

---

## 8. LTB notices / Ontario paperwork

### Recommended UX

LTB notices should be inside Documents as a specialized area.

Recommended location:

```text
Documents > Notices
```

### Important UX requirements

- Avoid legal-advice wording.
- Use plain language.
- Explain each notice type.
- Show last generated/sent date.
- Let users upload completed notices.
- Let users email a copy to tenants.
- Keep proof of delivery records where possible.

### Example helper copy

```text
Use this area to store Ontario rental notices and related paperwork.
Zigglo helps organize your records, but it does not provide legal advice.
Always confirm notice requirements with the LTB or a qualified professional.
```

### Developer action items

- [ ] Move LTB Notices under Documents.
- [ ] Add notice type descriptions.
- [ ] Add legal disclaimer.
- [ ] Add notice status: draft, generated, sent, uploaded, archived.
- [ ] Add proof-of-delivery attachment support.
- [ ] Add email confirmation before sending.

---

## 9. Maintenance

### Recommended UX

Maintenance should feel like a simple task board, not just a table.

### Recommended tabs or columns

```text
Open
In progress
Completed
```

### Maintenance card

```text
Leaking sink
424 Vine St · Basement Unit
Status: Open
Priority: Medium
Estimated cost: $250
Created: Jun 2, 2026

[Open] [Add receipt] [Mark complete]
```

### Maintenance detail should include

- Title
- Description
- Property
- Unit
- Status
- Priority
- Vendor
- Cost
- Invoices/receipts
- Before/after photos
- Notes
- Completion date

### Developer action items

- [ ] Add status-based maintenance board.
- [ ] Add priority field.
- [ ] Add vendor field.
- [ ] Add maintenance photos.
- [ ] Add receipts/invoices.
- [ ] Add completion date.
- [ ] Add maintenance cost summary.
- [ ] Link maintenance records to tax reports where appropriate.

---

## 10. Tax reports

### Purpose

Tax reports should help landlords export organized income and expense records.

### Recommended filters

- Year
- Property
- Unit
- Income category
- Expense category
- Maintenance
- Utilities
- Mortgage interest/manual entries if supported later

### Recommended outputs

- CSV export
- PDF summary
- Receipts package
- Income summary
- Expense summary

### Developer action items

- [ ] Move Tax Reports under Billing.
- [ ] Add export options.
- [ ] Add receipt package export.
- [ ] Add income/expense summary cards.
- [ ] Add missing receipt alerts.
- [ ] Add year/property filters.

---

## UI design system recommendations

## Typography

### Recommended font stack

Use a clean SaaS-style font such as Inter or Geist.

Recommended CSS:

```css
font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Alternative premium option:

```css
font-family: "Geist", system-ui, sans-serif;
```

### Type scale

Use consistent type scale:

```text
Page title: 28-32px / 700
Section title: 20-24px / 650
Card title: 16-18px / 650
Body text: 14-16px / 400-500
Caption/helper: 12-13px / 400
Button: 14px / 600
```

### Developer action items

- [ ] Standardize heading styles.
- [ ] Use the same font stack everywhere.
- [ ] Avoid random one-off text sizes.
- [ ] Use sentence case in UI labels.

---

## Color system

The current warm neutral direction is good. Keep it calm and landlord-friendly.

### Recommended semantic tokens

```css
--background: #FAF7F2;
--surface: #FFFFFF;
--surface-muted: #F4EFE7;

--text-primary: #201A16;
--text-secondary: #6F6259;
--text-muted: #9A8D84;

--primary: #B85C38;
--primary-hover: #9F4E30;
--primary-soft: #F4DED4;

--success: #2F7D32;
--success-soft: #E4F3E6;

--warning: #B26A00;
--warning-soft: #FFF3D6;

--danger: #B3261E;
--danger-soft: #FCE8E6;

--border: #E5DED5;
--focus-ring: #B85C38;
```

### Developer action items

- [ ] Define semantic CSS variables.
- [ ] Use success/warning/danger consistently.
- [ ] Avoid using color alone to communicate status.
- [ ] Add icons/text labels for important statuses.

---

## Layout and spacing

### Recommended spacing scale

Use an 8px spacing system:

```text
4px
8px
12px
16px
24px
32px
48px
64px
```

### Page layout

Use consistent max width:

```text
Main app pages: max-w-7xl
Forms: max-w-3xl or max-w-4xl
Detail pages: max-w-5xl
```

### Developer action items

- [ ] Standardize container width.
- [ ] Use consistent vertical spacing between sections.
- [ ] Use consistent card padding.
- [ ] Keep form pages narrower than dashboards.
- [ ] Avoid edge-to-edge dense tables.

---

## Component consistency

### Current issue

Some pages use shared components. Others use raw headings and local layouts.

### Recommendation

Standardize the following components:

- `PageHeader`
- `PageSection`
- `StatCard`
- `StatusBadge`
- `EmptyState`
- `DataTable`
- `MobileCardList`
- `ConfirmDialog`
- `FormSection`
- `HelpText`
- `Breadcrumbs`
- `ActionMenu`
- `Tabs`
- `FileUploadCard`

### Developer action items

- [ ] Use `PageHeader` on every page.
- [ ] Add `Breadcrumbs` on nested pages.
- [ ] Create reusable `EmptyState`.
- [ ] Create reusable `StatusBadge`.
- [ ] Create reusable `FormSection`.
- [ ] Replace repeated table/card markup with shared components.
- [ ] Use one button style system.

---

## Page header standard

Every page should use the same header structure.

Example:

```tsx
<PageHeader
  title="Maintenance"
  description="Track repairs, invoices, photos, and open work across your properties."
  actions={
    <>
      <ButtonLink href="/maintenance/new">Add maintenance</ButtonLink>
      <ButtonLink href="/maintenance/receipts" variant="outline">
        Receipt repository
      </ButtonLink>
    </>
  }
/>
```

### Developer action items

- [ ] Replace raw `<h1>` page headings with `PageHeader`.
- [ ] Add page descriptions.
- [ ] Keep primary action in the top-right.
- [ ] Move secondary actions into dropdowns where needed.

---

## Button and copy guidelines

### Use sentence case

Use:

```text
Add property
Generate statements
Upload bill
Record payment
Send statement
```

Avoid:

```text
Add Property
Generate Statements
Upload & Calculate Splits
Save Record
```

### Better button labels

| Current | Recommended |
|---|---|
| Save Record | Save maintenance item |
| Create Unit | Add unit |
| Upload & Calculate Splits | Upload bill and preview splits |
| Generate Statements | Generate monthly statements |
| Apply | Apply filters |
| Send notice email | Email notice to tenant |
| Save Rules | Save split rules |
| Import amounts (.xlsx) | Import bill spreadsheet |

### Developer action items

- [ ] Standardize all button labels to sentence case.
- [ ] Make every button action-specific.
- [ ] Avoid vague labels like "Save" when context is unclear.
- [ ] Use "Preview" before financial or email actions.

---

## Forms UX recommendations

### Form principles

Forms should be grouped, clear, and safe.

### Recommended form structure

```text
Basic information
Required fields first.

Financial details
Rent, due date, deposits, discounts.

Utility settings
Only show if relevant.

Documents
Upload lease, bill, receipt, or related file.

Review
Show final summary before saving.
```

### Form improvements

- Add section headers.
- Add helper text.
- Add inline validation.
- Add required markers.
- Add sensible defaults.
- Add cancel/back buttons.
- Add autosave for long forms where possible.
- Add review step for high-risk forms.

### Developer action items

- [ ] Group long forms into sections.
- [ ] Add inline validation messages.
- [ ] Add helper text under complex fields.
- [ ] Add input masks for money, dates, and percentages.
- [ ] Add review screen for statements and notices.
- [ ] Add better file upload states.

---

## Empty states

### Current issue

Empty states need to be more helpful and action-oriented.

### Recommended empty state pattern

```text
No utility bills yet

Upload this month's gas, water, or electricity bills so Zigglo can split costs by unit and generate accurate tenant statements.

[Upload bill PDF] [Import spreadsheet]
```

### Empty states to add

- No properties
- No units
- No tenants
- No utility bills
- No statements
- No documents
- No maintenance records
- No tax reports
- No LTB notices
- No search results
- No filters matched

### Developer action items

- [ ] Create reusable `EmptyState` component.
- [ ] Add contextual copy.
- [ ] Add one primary CTA.
- [ ] Add optional secondary CTA.
- [ ] Avoid dead-end empty pages.

---

## Status badges

Use consistent status labels across the app.

### Statement statuses

```text
Draft
Ready to send
Sent
Viewed
Partially paid
Paid
Overdue
Cancelled
```

### Maintenance statuses

```text
Open
In progress
Completed
Cancelled
```

### Document statuses

```text
Uploaded
Generated
Sent
Expired
Archived
```

### Lease statuses

```text
Active
Ending soon
Expired
Missing
```

### Utility bill statuses

```text
Uploaded
Missing
Duplicate
Needs review
Included in statement
```

### Developer action items

- [ ] Create shared `StatusBadge` component.
- [ ] Use consistent colors.
- [ ] Use consistent wording.
- [ ] Avoid creating one-off statuses.

---

## Mobile UX recommendations

### Main issue

Tables and dense admin pages will be hard to use on mobile.

### Recommended mobile strategy

On desktop:

- Tables are acceptable for dense lists.

On mobile:

- Convert tables into stacked cards.
- Keep primary actions visible.
- Put secondary actions in an overflow menu.
- Avoid horizontal scroll for core workflows.

### Mobile card example

```text
Statement #2026-06-A
Tenant: Natalia
Unit: Basement
Total: $2,140
Balance: $0
Status: Paid

[View] [Send receipt]
```

### Developer action items

- [ ] Replace mobile tables with cards.
- [ ] Test all pages at 375px width.
- [ ] Ensure modals fit mobile screens.
- [ ] Ensure upload flows work on mobile.
- [ ] Keep tap targets at least 44px.
- [ ] Make sidebar navigation easy to close.
- [ ] Add sticky bottom action for important mobile flows if needed.

---

## Accessibility recommendations

### Requirements

- Keyboard navigable
- Visible focus states
- Proper labels
- Good contrast
- Semantic headings
- Accessible dialogs/menus
- Non-color status indicators

### Developer action items

- [ ] Check heading hierarchy on every page.
- [ ] Add `aria-label` where icon-only buttons are used.
- [ ] Ensure all form inputs have labels.
- [ ] Ensure validation messages are associated with fields.
- [ ] Ensure dialogs trap focus.
- [ ] Ensure dropdowns can be controlled by keyboard.
- [ ] Ensure focus returns after modal close.
- [ ] Do not rely only on color for status.
- [ ] Test with keyboard only.
- [ ] Test with screen reader basics.

---

## Error prevention

This app handles money, tenant communication, and legal-ish paperwork, so error prevention is critical.

### Required warnings

Add warnings for:

- Utility split percentages do not total 100%.
- Statement generated with missing utility bills.
- Tenant has no email before sending.
- Duplicate utility bill exists for the same property/type/month.
- Payment amount is higher than statement balance.
- Notice email is about to be sent.
- Deleting property with units/tenants/documents.
- Deleting or cancelling statement.
- Lease end date has passed.
- Required document missing.
- File upload failed.
- Unsupported file type uploaded.

### Developer action items

- [ ] Add confirmation dialogs for high-risk actions.
- [ ] Add preview before sending statements.
- [ ] Add preview before emailing notices.
- [ ] Add validation on financial fields.
- [ ] Add duplicate detection.
- [ ] Add clear recovery steps in error messages.

---

## Search and filtering

### Recommended global search

Add a global search bar that can find:

- Property
- Unit
- Tenant
- Statement
- Document
- Maintenance item
- Utility bill
- Notice

### Recommended filters by page

Properties:

- Address
- Occupancy
- Billing status

Billing:

- Month
- Property
- Status
- Tenant
- Balance

Documents:

- Property
- Unit
- Tenant
- Type
- Date
- Tags

Maintenance:

- Property
- Unit
- Status
- Priority
- Vendor
- Date

### Developer action items

- [ ] Add global search.
- [ ] Add page-level filters.
- [ ] Add clear filters button.
- [ ] Add empty state for no filter results.
- [ ] Persist useful filters in URL query params.
- [ ] Make filtered views shareable/bookmarkable.

---

## Global create action

### Recommendation

Add a global `+ New` button in the top bar.

Dropdown options:

```text
Property
Unit
Tenant
Utility bill
Statement
Maintenance item
Notice
Document
```

### Developer action items

- [ ] Add global create dropdown.
- [ ] Group create options by category.
- [ ] Hide or disable unavailable options based on setup state.
- [ ] Use helpful disabled messages.

Example:

```text
Add tenant
Create a property and unit first.
```

---

## Breadcrumbs

### Recommendation

Add breadcrumbs on nested pages.

Examples:

```text
Properties / 424 Vine St
Properties / 424 Vine St / Basement Unit
Properties / 424 Vine St / Basement Unit / Utility split rules
Billing / Statements / June 2026 / Basement Unit
Documents / Notices / N4 notice
```

### Developer action items

- [ ] Create shared `Breadcrumbs` component.
- [ ] Add to property detail pages.
- [ ] Add to unit detail pages.
- [ ] Add to statement detail pages.
- [ ] Add to document detail pages.
- [ ] Add to maintenance detail pages.

---

## Confirmation and success messages

### Recommended success pattern

After important actions, show confirmation and next action.

Example:

```text
Statement generated

June statement for Basement Unit is ready to review.

[Review statement] [Generate another]
```

### Recommended destructive confirmation

Example:

```text
Delete property?

This will remove the property from your dashboard. Existing documents, statements, and tenant records may also be affected.

Type DELETE to confirm.
```

### Developer action items

- [ ] Add contextual success toasts.
- [ ] Add next-action buttons in success states.
- [ ] Add stronger destructive confirmations.
- [ ] Avoid generic "Success" messages.

---

## QA checklist

Use this checklist before release.

### Core setup flow

- [ ] User can create account.
- [ ] User can add first property.
- [ ] User can add unit.
- [ ] User can add tenant.
- [ ] User can upload lease.
- [ ] User can configure utility split rules.
- [ ] User can return to dashboard and see setup progress.

### Billing flow

- [ ] User can upload utility bill.
- [ ] User can import bill spreadsheet.
- [ ] User can preview utility splits.
- [ ] User can generate statement draft.
- [ ] User can review statement.
- [ ] User can send statement.
- [ ] User can record partial payment.
- [ ] User can record full payment.
- [ ] User can generate receipt.
- [ ] User can download PDF.
- [ ] User can see statement status update correctly.

### Documents flow

- [ ] User can upload document.
- [ ] User can associate document with property.
- [ ] User can associate document with unit.
- [ ] User can associate document with tenant.
- [ ] User can filter by document type.
- [ ] User can preview/download document.
- [ ] User can replace document.
- [ ] User can delete/archive document.

### Maintenance flow

- [ ] User can create maintenance item.
- [ ] User can assign it to property/unit.
- [ ] User can add status.
- [ ] User can add priority.
- [ ] User can attach invoice/receipt.
- [ ] User can mark complete.
- [ ] User can see maintenance cost in reports.

### Notices flow

- [ ] User can create/upload notice.
- [ ] User can associate notice with tenant/unit.
- [ ] User can preview notice.
- [ ] User sees legal disclaimer.
- [ ] User confirms before emailing notice.
- [ ] Notice send status is recorded.

### Mobile QA

- [ ] Sidebar works on mobile.
- [ ] Tables become usable cards or scroll safely.
- [ ] Forms fit mobile width.
- [ ] Dialogs fit mobile height.
- [ ] Buttons are easy to tap.
- [ ] File upload works on mobile.
- [ ] Dashboard cards stack cleanly.

### Accessibility QA

- [ ] Full app can be used with keyboard.
- [ ] Focus states are visible.
- [ ] Forms have labels.
- [ ] Dialogs trap focus.
- [ ] Menus are keyboard accessible.
- [ ] Statuses do not rely on color only.
- [ ] Error messages are clear.
- [ ] Heading order is logical.

### Security/authorization QA

- [ ] User cannot access another user's property by URL.
- [ ] User cannot access another user's documents by URL.
- [ ] User cannot access another user's statements by URL.
- [ ] Server actions validate ownership.
- [ ] File uploads are restricted by user/property ownership.
- [ ] Dangerous actions validate authorization server-side.

### Build QA

Recommended CI workflow:

```bash
npm ci
npm run db:generate
npm run lint
npm run typecheck
npm run build
npm test
```

If `typecheck` script does not exist, add:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Priority roadmap

## Phase 1: Navigation and consistency

Goal: Make the app easier to understand immediately.

Tasks:

- [ ] Simplify sidebar.
- [ ] Add Billing parent page.
- [ ] Move utility bills/statements/tax reports into Billing.
- [ ] Move notices into Documents.
- [ ] Use `PageHeader` everywhere.
- [ ] Standardize button labels.
- [ ] Add breadcrumbs.
- [ ] Add reusable empty states.
- [ ] Add status badge system.

## Phase 2: Monthly billing workflow

Goal: Make the core value obvious and better than competitors.

Tasks:

- [ ] Build Monthly Workflow page.
- [ ] Add billing readiness status.
- [ ] Add missing utility bill warnings.
- [ ] Add split preview.
- [ ] Add statement preview.
- [ ] Add draft/review/send flow.
- [ ] Add payment tracking.
- [ ] Add receipt generation.

## Phase 3: Mobile and usability polish

Goal: Make the app feel premium and usable on phone.

Tasks:

- [ ] Convert mobile tables to cards.
- [ ] Improve mobile menu.
- [ ] Add global create button.
- [ ] Add global search.
- [ ] Improve form grouping.
- [ ] Improve success/error messages.
- [ ] Add better loading skeletons.

## Phase 4: Documents and Ontario workflows

Goal: Strengthen the local Ontario landlord advantage.

Tasks:

- [ ] Improve document categories.
- [ ] Add lease status.
- [ ] Add notice type explanations.
- [ ] Add proof-of-delivery attachments.
- [ ] Add legal disclaimer copy.
- [ ] Add document tags.
- [ ] Add receipt package export.

## Phase 5: Reporting and advanced features

Goal: Add power without making MVP complex.

Tasks:

- [ ] Improve tax report export.
- [ ] Add income/expense dashboard.
- [ ] Add maintenance cost reporting.
- [ ] Add tenant payment portal improvements.
- [ ] Add integrations only after core flows are excellent.

---

## Suggested developer implementation order

1. Create/standardize shared UI components.
2. Refactor sidebar and route groupings.
3. Add Billing parent page with tabs.
4. Add Monthly Workflow page.
5. Improve property and unit detail pages with tabs.
6. Add mobile card views.
7. Add validation and warnings.
8. Add global create.
9. Add global search.
10. Polish empty states, copy, and toasts.
11. Run full QA checklist.
12. Run accessibility pass.
13. Run production build and deployment QA.

---

## Definition of done for improved MVP

The improved MVP should be considered ready when a new landlord can complete this flow without help:

1. Add a property.
2. Add a unit.
3. Add a tenant.
4. Add utility split rules.
5. Upload a utility bill.
6. Generate a monthly statement.
7. Preview the statement.
8. Send it to the tenant.
9. Record payment.
10. Download a receipt.
11. Upload/store lease and related documents.
12. Add a maintenance item.
13. Export year-to-date report.

The user should always know:

- Where they are
- What needs attention
- What action to take next
- What data is missing
- Whether a statement is draft, sent, overdue, or paid
- Where documents are stored
- How to get back to a property, unit, tenant, or statement

---

## Final product direction

Zigglo should feel like:

> A calm, modern, Ontario-focused landlord operating system for small portfolios.

The product should prioritize:

- Simplicity over feature volume
- Monthly billing clarity
- Utility split accuracy
- Document organization
- Ontario landlord paperwork
- Mobile-friendly workflows
- Error prevention
- Trust and professionalism

The app will be stronger if it feels less like software for property managers and more like a reliable monthly assistant for small landlords.
