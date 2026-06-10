/**
 * Billing feature public API.
 * Import from here in pages/actions when you need billing domain logic.
 * Implementation lives in src/lib/* until modules migrate into features/billing/.
 */

export {
  generateStatementsForProperty,
  generateStatementForUnit,
  refreshStatement,
  calculateUtilitySplits,
  recalculatePropertyUtilitySplits,
  buildStatementNumber,
  getPriorStatementPeriod,
} from "@/lib/statements";

export { sendStatementById } from "@/lib/statement-send";
export { aggregateStatementStats } from "@/lib/statement-stats";
export { recordStatementPayment } from "@/lib/record-payment";
export { syncOverdueStatements } from "@/lib/overdue";
export { runAutoBillingForUser } from "@/lib/auto-billing";
export {
  computeBillingReadiness,
  buildBillingNextSteps,
} from "@/lib/billing-workflow";
export {
  getPaymentStatus,
  getOutstandingCents,
  getStatementOutstandingCents,
  PAYMENT_STATUS_LABELS,
  PAYMENT_BREAKDOWN_ORDER,
  PAYMENT_STATUS_ACCENTS,
} from "@/lib/payment-status";
export {
  MONTH_NAMES,
  UTILITY_TYPE_LABELS,
  yearOptions,
} from "@/lib/billing-constants";
