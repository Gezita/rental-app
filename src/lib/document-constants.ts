import type { DocumentCategory } from "@prisma/client";

/** Canonical document category order + labels — keep selects and hubs in sync. */
export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  lease: "Lease",
  utility_bill: "Utility Bill",
  statement: "Statement",
  receipt: "Receipt",
  maintenance_invoice: "Maintenance Invoice",
  maintenance_receipt: "Maintenance Receipt",
  ltb_notice: "LTB Notice",
  tax_report: "Tax Report",
  notice: "Notice",
  photo: "Photo",
  other: "Other",
};

export const DOCUMENT_CATEGORIES = Object.keys(
  DOCUMENT_CATEGORY_LABELS
) as DocumentCategory[];
