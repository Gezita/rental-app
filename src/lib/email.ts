type EmailPayload = {
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachmentName?: string;
};

export async function sendEmail(payload: EmailPayload) {
  console.log("\n========== EMAIL (dev mode) ==========");
  console.log(`To: ${payload.to}`);
  console.log(`Subject: ${payload.subject}`);
  console.log(payload.body);
  if (payload.html) {
    console.log("[HTML email included — length:", payload.html.length, "chars]");
  }
  if (payload.attachmentName) {
    console.log(`Attachment: ${payload.attachmentName}`);
  }
  console.log("======================================\n");
  return { success: true, id: `dev-${Date.now()}` };
}

export {
  buildStatementEmailContent,
  buildReceiptEmailContent,
  buildLtbNoticeEmailContent,
  buildAnnouncementEmailContent,
  buildPartialPaymentEmailContent,
} from "@/lib/tenant-communications";

import {
  buildStatementEmailContent,
  buildReceiptEmailContent,
} from "@/lib/tenant-communications";

/** @deprecated Use buildStatementEmailContent */
export function buildStatementEmail(params: {
  tenantName: string;
  unitName: string;
  monthLabel: string;
  totalDue: string;
  dueDate: string;
  paymentInstructions?: string;
  landlordName: string;
  payUrl?: string;
}) {
  const content = buildStatementEmailContent({
    ...params,
    propertyName: params.unitName,
    propertyAddress: "",
  });
  return { subject: content.subject, body: content.text };
}

/** @deprecated Use buildReceiptEmailContent */
export function buildReceiptEmail(params: {
  tenantName: string;
  monthLabel: string;
  paymentAmount: string;
  paymentDate: string;
  landlordName: string;
}) {
  const content = buildReceiptEmailContent(params);
  return { subject: content.subject, body: content.text };
}
