# src/app/actions — Server Actions

All data mutations go through server actions in this directory. There are no REST mutation endpoints.

## Rules

- **Every action must call `requireUser()` then an ownership helper** before any DB access.
- **Validate all user input** using schemas from `src/lib/validation.ts`.
- **Never skip auth.** Missing auth checks are the most critical bug class in this codebase.
- **Redirect on success** using `redirect()`, or return `{ error: string }` on failure.
- **Flash feedback** — redirect with `?error=…` or `?saved=1`; pages read these with `FlashAlert`.

## Pattern

```ts
export async function myAction(formData: FormData) {
  const user = await requireUser();
  const property = await requireProperty(user.id, propertyId);
  // validate input, do work, redirect or return error
}
```

## Action files

| File | Exports |
|------|---------|
| `properties.ts` | `createPropertyAction`, `updatePropertyFinancesAction`, `deletePropertyAction`, `createUnitAction`, `updateUnitAction`, `deleteUnitAction`, `createTenantAction`, `updateTenantAction`, `moveOutTenantAction`, `saveUtilityRulesAction`, `saveUtilityProfileAction`, `applyUtilityProfileAction`, `deleteUtilityProfileAction`, `createUtilityBillAction`, `importUtilityBillsXlsxAction`, `previewUtilityBillsImportAction`, `addUtilityBillDatabaseAction` |
| `statements.ts` | `generateStatementsAction`, `createPastStatementAction`, `generateDraftStatementPdfAction`, `sendStatementAction`, `recordStatementPaymentAction`, `markStatementPaidAction`, `runAutoBillingAction`, `sendReceiptEmailAction`, `deleteStatementAction`, `refreshStatementAction` |
| `documents.ts` | `uploadDocumentAction`, `uploadLeaseAction`, `deleteDocumentAction`, `deleteDocumentsAction` |
| `leases.ts` | `generateLeaseAction`, `generateStandardLease2229eAction` |
| `lease-signing.ts` | `saveLeaseDraftAction`, `sendLeaseForSignatureAction`, `markLeaseSignedAction` |
| `communications.ts` | `uploadLtbNoticeAction`, `sendLtbNoticeEmailAction`, `sendAnnouncementEmailAction`, `uploadMaintenanceReceiptAction`, `generateLtbNoticeAction` |
| `inspections.ts` | `createInspectionAction`, `saveInspectionAction`, `uploadInspectionItemPhotoAction`, `deleteInspectionAction` |
| `tax.ts` | `exportT776ReportAction` |
| `settings.ts` | `updateSettingsAction`, `updateProfileAction` |
| `integrations.ts` | `updateIntegrationsAction` |
| `maintenance.ts` | `createMaintenanceAction` |
| `search.ts` | Global search action |
| `auth.ts` | `signUpAction`, `signInAction`, `signOutAction` |

`index.ts` re-exports everything — import from `@/app/actions` or the specific file.
