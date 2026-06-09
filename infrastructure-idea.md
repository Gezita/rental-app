# Coding Standards & Architecture Guide

## Purpose

This document defines the architecture, coding standards, folder structure, and development practices that should be followed for all projects to ensure code remains maintainable, scalable, performant, and easy to understand.

---

## Zigglo (this repo) — implementation map

Use this map when applying the patterns below to the rentals dashboard. See `AGENTS.md` and `CLAUDE.md` for run commands and product rules.

| Guide concept | Zigglo location |
|---------------|-----------------|
| `app/dashboard`, routes | `src/app/(dashboard)/` — Next.js App Router pages |
| Feature modules | `src/features/billing/` (facade); more domains can follow |
| UI primitives | `src/components/ui/` |
| Layout | `src/components/layout/` |
| Shared dashboard UI | `src/components/dashboard/` |
| Core infra (`db`, `auth`, `storage`, `utils`) | `src/lib/db.ts`, `auth.ts`, `storage.ts`, `utils.ts` |
| Business logic (services) | `src/lib/*` — e.g. `statements.ts`, `record-payment.ts` |
| Server actions (mutations) | `src/app/actions/` — one file per domain; barrel: `index.ts` |
| Email delivery | `src/server/emails/send.ts` (dev console stub) |
| Email content | `src/lib/tenant-communications.ts` |
| Authorization | `src/lib/ownership.ts` + `requireUser()` in every action/page |
| Validation | `src/lib/validation.ts` (shared parsers; Zod optional later) |
| Constants | `src/lib/billing-constants.ts` — `MONTH_NAMES`, utility labels |
| File uploads | `src/lib/storage.ts` + `src/lib/files.ts` |
| Database | `prisma/schema.prisma` — SQLite dev / Postgres optional |

**Import conventions**

- Actions: `@/app/actions` (not per-file paths unless breaking a circular dep)
- Billing domain: `@/features/billing` for cross-cutting billing imports
- Constants: `@/lib/billing-constants` — never via `statements.ts` re-exports
- Payments: `@/lib/payment-status` for `getOutstandingCents` / status badges

---

# Core Principles

The goal is to build software that is:

* Easy to understand
* Easy to maintain
* Easy to extend
* Easy to test
* Easy to onboard new developers
* Fast and performant
* Consistent across the entire codebase

Every decision should optimize for long-term maintainability rather than short-term speed.

---

# Recommended Technology Stack

## Frontend

```txt
Next.js
TypeScript
Tailwind CSS
shadcn/ui
```

### Why

* Strong typing
* Excellent performance
* Large ecosystem
* Server-side rendering support
* Scalable architecture
* Great developer experience

---

## Backend

```txt
Next.js Server Actions
TypeScript
```

For larger systems:

```txt
NestJS
```

---

## Database

```txt
PostgreSQL
```

### Why

* Mature
* Reliable
* Excellent performance
* Strong relational modeling

---

## ORM

```txt
Prisma
```

### Why

* Type-safe queries
* Easy migrations
* Excellent developer experience

---

## Authentication

Choose one:

```txt
Clerk
Auth.js
Supabase Auth
```

---

## Storage

Choose one:

```txt
AWS S3
Cloudflare R2
Supabase Storage
```

---

# Architecture Philosophy

## Feature-Based Architecture

Avoid organizing code by technical type only.

### Bad

```txt
components/
services/
types/
utils/
```

As projects grow, this becomes difficult to maintain.

---

### Good

Organize around business features.

```txt
features/
  units/
  tenants/
  bills/
  maintenance/
  documents/
```

Each feature owns its:

* Components
* Business logic
* Validation
* Types
* API actions

---

# Recommended Folder Structure

```txt
src/
│
├── app/
│   ├── dashboard/
│   ├── units/
│   ├── tenants/
│   ├── bills/
│   ├── maintenance/
│   └── settings/
│
├── features/
│
│   ├── units/
│   │   ├── components/
│   │   ├── actions/
│   │   ├── services/
│   │   ├── schemas/
│   │   └── types.ts
│
│   ├── tenants/
│   │   ├── components/
│   │   ├── actions/
│   │   ├── services/
│   │   ├── schemas/
│   │   └── types.ts
│
│   ├── bills/
│   │   ├── components/
│   │   ├── actions/
│   │   ├── services/
│   │   ├── schemas/
│   │   └── types.ts
│
│   └── maintenance/
│
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
│
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   ├── storage.ts
│   └── utils.ts
│
├── server/
│   ├── permissions/
│   ├── validations/
│   ├── jobs/
│   └── emails/
│
└── prisma/
    └── schema.prisma
```

---

# Separation of Concerns

Every file should have a single responsibility.

---

## UI Components

Responsible only for:

* Rendering
* User interaction
* Visual state

Example:

```txt
tenant-card.tsx
bill-table.tsx
maintenance-form.tsx
```

UI components should not perform business calculations.

---

## Services

Responsible for:

* Business logic
* Calculations
* Complex operations

Example:

```txt
calculate-rent.ts
calculate-utility-share.ts
generate-monthly-invoice.ts
```

---

## Schemas

Responsible for:

* Input validation
* Form validation
* API validation

Use:

```txt
Zod
```

Example:

```txt
tenant-schema.ts
bill-schema.ts
invoice-schema.ts
```

---

## Actions

Responsible for:

* Database operations
* Create
* Read
* Update
* Delete

Example:

```txt
create-unit.ts
update-tenant.ts
delete-document.ts
```

---

# Naming Conventions

Always use descriptive names.

---

## Good

```txt
calculate-tenant-share.ts

generate-monthly-invoice.ts

tenant-contact-card.tsx

upload-document-button.tsx
```

---

## Bad

```txt
helper.ts

data.ts

stuff.ts

misc.ts

form.tsx
```

Avoid generic names.

---

# Component Guidelines

Keep components small.

---

## Good

```txt
TenantCard

TenantList

TenantContactSection
```

---

## Bad

```txt
TenantPageComponentWithEverything
```

If a component exceeds 200–300 lines, consider splitting it.

---

# Business Logic Rules

Never place business logic inside:

```txt
page.tsx
component.tsx
```

Instead:

```txt
services/
```

Example:

### Bad

```tsx
const tenantShare =
  utilityBill * percentage;
```

inside component.

---

### Good

```ts
calculateTenantShare()
```

inside service.

---

# Database Design Principles

Prefer normalized relational data.

---

## Core Tables

```txt
User

Property

Unit

Tenant

Lease

UtilityBill

Document

MaintenanceTask

Invoice

Payment
```

---

## Relationships

```txt
Property
 └── Units

Unit
 ├── Tenants
 ├── Documents
 ├── Utility Bills
 ├── Maintenance Tasks
 ├── Invoices
 └── Payments
```

---

# TypeScript Standards

Enable strict mode.

```json
{
  "strict": true
}
```

---

Avoid:

```ts
any
```

Prefer:

```ts
unknown
```

or proper interfaces.

---

Always define:

```ts
interface Tenant {}

interface Unit {}

interface Invoice {}
```

---

# Validation Standards

Every input must be validated.

Use:

```txt
Zod
```

Never trust:

* Forms
* API requests
* Query parameters

---

# Performance Guidelines

---

## Server Components First

Default:

```txt
Server Components
```

Only use:

```txt
"use client"
```

when necessary.

---

## Pagination

Never load:

```txt
All tenants
All bills
All documents
```

Use pagination.

---

## Lazy Loading

Load heavy content only when needed.

Examples:

* PDFs
* Charts
* Reports
* Images

---

## Database Optimization

Create indexes for:

```txt
userId

propertyId

tenantId

invoiceId

createdAt
```

---

# Security Standards

---

## Authentication

All sensitive routes require authentication.

---

## Authorization

Verify ownership before data access.

Example:

```txt
Can this user access this property?
```

---

## File Uploads

Validate:

```txt
Size
Type
Ownership
```

---

## Secrets

Never commit:

```txt
API Keys
Passwords
Tokens
Secrets
```

Use:

```txt
Environment Variables
```

---

# Code Quality Standards

---

## Formatting

Use:

```txt
Prettier
```

---

## Linting

Use:

```txt
ESLint
```

---

## Testing

Recommended:

```txt
Vitest
Playwright
```

---

# Required Project Files

Every project should contain:

```txt
README.md

.env.example

docker-compose.yml

prisma/schema.prisma

eslint.config.js

prettier.config.js
```

---

# Development Checklist

Before merging code:

* Is the code readable?
* Is it strongly typed?
* Is validation implemented?
* Is business logic separated?
* Is it reusable?
* Is it tested?
* Is it secure?
* Is it documented?
* Is it performant?

If any answer is "no", improve it before merging.

---

# Golden Rule

Before creating any file ask:

1. What feature does this belong to?
2. Is this UI, business logic, validation, or data access?
3. Can this be reused?
4. Is this file doing more than one thing?
5. Will another developer understand this in six months?

If not, refactor before continuing.

---

# Architecture Summary

Use:

```txt
Next.js
TypeScript
PostgreSQL
Prisma
Tailwind
shadcn/ui
Feature-Based Architecture
```

Organize by business domain:

```txt
Units
Tenants
Bills
Documents
Maintenance
Invoices
Settings
```

Keep:

```txt
Pages thin
Services smart
Components simple
Validation everywhere
Types strict
```

This approach prevents spaghetti code and creates a codebase that can scale from an MVP to a production-grade application.
