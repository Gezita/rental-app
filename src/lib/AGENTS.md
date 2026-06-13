# src/lib — Library modules

Business logic, utilities, and infrastructure helpers. All files here are server-side unless noted.

## Rules

- **No client imports.** `xlsx`, `pdf-lib`, `storage.ts`, `r2.ts`, and `email-templates.ts` must never be imported in client components.
- **No raw SQL.** All DB access goes through `db.ts` (Prisma). No `$queryRaw` or `$executeRaw`.
- **Money is integer cents.** Use `formatMoney` / `parseMoneyToCents` from `money.ts`. Never floats.
- **Don't duplicate constants.** `billing-constants.ts` owns `MONTH_NAMES`, utility labels, year options. `navigation.ts` owns nav items. `section-tabs.ts` owns tab arrays. `document-constants.ts` owns document category labels.

## Module map

### Billing & statements
| File | What it does |
|------|-------------|
| `statements.ts` | Core statement generation, utility split calculation, prior-balance roll-forward |
| `statement-extras.ts` | One-off extra charge line items on statements |
| `statement-preview.ts` | Pre-send preview data builder |
| `statement-send.ts` | Sends statement email with attached PDF |
| `statement-stats.ts` | Aggregate stats (dashboard and statements page) |
| `billing-workflow.ts` | Monthly billing workflow — computes next steps per property |
| `billing-constants.ts` | `MONTH_NAMES`, utility type labels, year options — canonical, do not duplicate |
| `record-payment.ts` | Payment recording, receipt generation, Stripe webhook handling |
| `auto-billing.ts` | Cron-triggered auto-generate + email statements |
| `overdue.ts` | Syncs `overdue` status on statements (called on dashboard/statements load) |
| `payment-status.ts` | Derives the UI-facing payment status — use `PaymentStatusBadge`, don't replicate |
| `past-statements.ts` | Lookup helpers for past statement records |

### Utility bills
| File | What it does |
|------|-------------|
| `parse-bills-xlsx.ts` | Parses spreadsheet uploads into `UtilityBill` upserts (server-only, dynamically imported) |
| `utility-profiles.ts` | Reusable utility split rule profiles — serialize/deserialize profile rules |
| `utility-split-preview.ts` | Computes a preview of splits before they're saved |
| `utility-split-validation.ts` | Validates utility split inputs |
| `utility-bill-month.ts` | Utility bill month helper functions |

### Tax
| File | What it does |
|------|-------------|
| `t776-report.ts` | Aggregates data for the T776 rental income tax section |
| `export-t776.ts` | Orchestrates T776 PDF form export |
| `fill-t776-form.ts` | Low-level T776 PDF field filling via pdf-lib |

### Documents & files
| File | What it does |
|------|-------------|
| `storage.ts` | **Unified file storage entry point.** Local `./uploads` in dev; Cloudflare R2 in production. Always use this — never read/write user files directly. |
| `r2.ts` | Cloudflare R2 S3-compatible client (used internally by `storage.ts`) |
| `files.ts` | Thin re-export wrapper around `storage.ts` — prefer importing from `storage.ts` directly |
| `document-constants.ts` | Document category labels and constants |
| `pdf.ts` | PDF generation for statements, receipts, and lease PDFs (server-only) |

### Leases & legal
| File | What it does |
|------|-------------|
| `ltb-forms.ts` | LTB form catalogue — codes, names, official download URLs |
| `ltb-notice-wizard.ts` | Multi-step LTB notice wizard — field definitions and PDF-filling logic |
| `standard-lease-2229e.ts` | Fills Ontario Form 2229e standard lease PDF from unit/lease data |
| `lease-wizard.ts` | Multi-step lease creation wizard logic |
| `docusign.ts` | DocuSign envelope creation for e-signing (requires `DOCUSIGN_*` env vars) |

### Email
| File | What it does |
|------|-------------|
| `email-templates.ts` | Lessora-branded HTML email layout builder (`renderEmailLayout`) |
| `tenant-communications.ts` | Content builders for statement, receipt, and announcement emails |

### Inspections & maintenance
| File | What it does |
|------|-------------|
| `inspection-checklist.ts` | Default inspection checklist items and status label constants |

### Auth & security
| File | What it does |
|------|-------------|
| `auth.ts` | `requireUser()` — React.cache-wrapped session check; redirects to sign-in if unauthenticated |
| `ownership.ts` | `requireProperty`, `requireUnit`, `requireTenant`, `requireStatement`, `requireDocument` — scope DB queries by userId |
| `session-token.ts` | HMAC-signed session cookie helpers |
| `rate-limit.ts` | DB-backed login attempt tracking; locks key after 5 failures for 15 minutes |

### Dashboard & navigation
| File | What it does |
|------|-------------|
| `dashboard-hero-stats.ts` | Hero stat aggregation for the dashboard home page |
| `portfolio-stats.ts` | Portfolio-level statistics |
| `lease-reminders.ts` | Returns leases ending within N days |
| `navigation.ts` | `dashboardNavItems` — single source of truth for the sidebar nav |
| `section-tabs.ts` | Tab arrays for billing, documents, and settings sections |

### Deploy & infrastructure
| File | What it does |
|------|-------------|
| `deploy-config.ts` | `isLocalDataOnlyDeploy()` — true on Vercel without `ALLOW_CLOUD_DATA` |
| `cloud-guard.ts` | `assertCloudDataAllowed()` — redirects to `/get-started` on landing deploys |
| `db.ts` | Singleton Prisma client |
| `stripe.ts` | Stripe client helpers |

### Utilities
| File | What it does |
|------|-------------|
| `money.ts` | `formatMoney(cents)`, `parseMoneyToCents(string)` |
| `validation.ts` | All shared Zod input validation schemas |
| `utils.ts` | `cn()` for class composition |
| `search.ts` | Global search query helpers |
