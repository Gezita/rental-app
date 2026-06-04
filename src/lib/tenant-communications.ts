import {
  emailButton,
  emailCallout,
  emailInfoRow,
  emailInfoTable,
  emailParagraph,
  renderEmailLayout,
} from "@/lib/email-templates";

export type StatementEmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function buildStatementEmailContent(params: {
  tenantName: string;
  unitName: string;
  propertyName: string;
  propertyAddress: string;
  monthLabel: string;
  totalDue: string;
  dueDate: string;
  paymentInstructions?: string;
  landlordName: string;
  landlordEmail?: string;
  payUrl?: string;
  notes?: string;
}): StatementEmailContent {
  const subject = `${params.monthLabel} Statement — ${params.unitName}`;
  const paymentInstructions =
    params.paymentInstructions || "Please contact your landlord for payment details.";

  const bodyHtml = [
    emailParagraph(`Hi ${params.tenantName},`),
    emailParagraph(
      `Your monthly statement for ${params.monthLabel} is ready. Please review the attached PDF for rent, utility charges, and any prior balance.`
    ),
    emailInfoTable(
      [
        emailInfoRow("Property", params.propertyName),
        emailInfoRow("Unit", params.unitName),
        emailInfoRow("Address", params.propertyAddress),
        emailInfoRow("Statement period", params.monthLabel),
        emailInfoRow("Total due", params.totalDue),
        emailInfoRow("Due date", params.dueDate),
      ].join("")
    ),
    params.payUrl
      ? emailButton("Pay online securely", params.payUrl)
      : "",
    emailCallout(`Payment instructions: ${paymentInstructions}`),
    params.notes ? emailCallout(params.notes, "info") : "",
    emailParagraph("If you have questions about this statement, reply to this email."),
  ].join("");

  const html = renderEmailLayout({
    title: "Monthly Statement",
    preheader: `${params.monthLabel} statement — ${params.totalDue} due ${params.dueDate}`,
    landlordName: params.landlordName,
    landlordEmail: params.landlordEmail,
    bodyHtml,
    footerNote: "This message was sent from your landlord's Rentals Dashboard account.",
  });

  const text = [
    `Hi ${params.tenantName},`,
    "",
    `Your monthly statement for ${params.monthLabel} is ready.`,
    "",
    `Property: ${params.propertyName}`,
    `Unit: ${params.unitName}`,
    `Address: ${params.propertyAddress}`,
    `Total due: ${params.totalDue}`,
    `Due date: ${params.dueDate}`,
    params.payUrl ? `Pay online: ${params.payUrl}` : "",
    "",
    `Payment instructions: ${paymentInstructions}`,
    params.notes ? `Notes: ${params.notes}` : "",
    "",
    `Thank you,`,
    params.landlordName,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, text, html };
}

export function buildReceiptEmailContent(params: {
  tenantName: string;
  monthLabel: string;
  paymentAmount: string;
  paymentDate: string;
  outstandingBalance?: string;
  landlordName: string;
  landlordEmail?: string;
}): StatementEmailContent {
  const subject = `Payment Receipt — ${params.monthLabel}`;
  const bodyHtml = [
    emailParagraph(`Hi ${params.tenantName},`),
    emailParagraph(`Thank you. We received your payment and generated a receipt for your records.`),
    emailInfoTable(
      [
        emailInfoRow("Statement period", params.monthLabel),
        emailInfoRow("Payment amount", params.paymentAmount),
        emailInfoRow("Payment date", params.paymentDate),
        params.outstandingBalance
          ? emailInfoRow("Remaining balance", params.outstandingBalance)
          : "",
      ]
        .filter(Boolean)
        .join("")
    ),
    params.outstandingBalance
      ? emailCallout(
          `A balance of ${params.outstandingBalance} remains outstanding on this statement.`,
          "warning"
        )
      : emailParagraph("This payment satisfies the statement balance in full."),
    emailParagraph("Your receipt is attached as a PDF."),
  ].join("");

  const html = renderEmailLayout({
    title: "Payment Receipt",
    preheader: `Payment of ${params.paymentAmount} received on ${params.paymentDate}`,
    landlordName: params.landlordName,
    landlordEmail: params.landlordEmail,
    bodyHtml,
  });

  const text = [
    `Hi ${params.tenantName},`,
    "",
    `Thank you. Your payment of ${params.paymentAmount} was recorded on ${params.paymentDate}.`,
    params.outstandingBalance
      ? `Remaining balance: ${params.outstandingBalance}`
      : "This payment satisfies the statement in full.",
    "",
    "Your receipt is attached.",
    "",
    params.landlordName,
  ].join("\n");

  return { subject, text, html };
}

export function buildLtbNoticeEmailContent(params: {
  tenantName: string;
  formCode: string;
  formName: string;
  propertyName: string;
  unitName: string;
  propertyAddress: string;
  effectiveDate?: string;
  customMessage?: string;
  landlordName: string;
  landlordEmail?: string;
}): StatementEmailContent {
  const subject = `${params.formCode} Notice — ${params.propertyName}, ${params.unitName}`;
  const bodyHtml = [
    emailParagraph(`Hi ${params.tenantName},`),
    emailParagraph(
      `Please find attached an official Ontario Landlord and Tenant Board ${params.formCode} form (${params.formName}) regarding your tenancy.`
    ),
    emailInfoTable(
      [
        emailInfoRow("Notice form", `${params.formCode} — ${params.formName}`),
        emailInfoRow("Property", params.propertyName),
        emailInfoRow("Unit", params.unitName),
        emailInfoRow("Address", params.propertyAddress),
        params.effectiveDate ? emailInfoRow("Effective / termination date", params.effectiveDate) : "",
      ]
        .filter(Boolean)
        .join("")
    ),
    params.customMessage ? emailCallout(params.customMessage) : "",
    emailCallout(
      "This notice is provided for your records. If you have questions about your rights or next steps, consult the Landlord and Tenant Board or seek legal advice.",
      "warning"
    ),
    emailParagraph("The completed notice is attached as a PDF."),
  ].join("");

  const html = renderEmailLayout({
    title: `${params.formCode} Tenant Notice`,
    preheader: `${params.formCode} notice for ${params.unitName}`,
    landlordName: params.landlordName,
    landlordEmail: params.landlordEmail,
    bodyHtml,
    footerNote: "Official blank forms are available at tribunalsontario.ca/ltb/forms/",
  });

  const text = [
    `Hi ${params.tenantName},`,
    "",
    `Attached is ${params.formCode} (${params.formName}) for ${params.propertyName}, ${params.unitName}.`,
    `Address: ${params.propertyAddress}`,
    params.effectiveDate ? `Effective date: ${params.effectiveDate}` : "",
    params.customMessage ? params.customMessage : "",
    "",
    params.landlordName,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, text, html };
}

export function buildAnnouncementEmailContent(params: {
  tenantName: string;
  subjectLine: string;
  propertyName?: string;
  unitName?: string;
  message: string;
  landlordName: string;
  landlordEmail?: string;
}): StatementEmailContent {
  const subject = params.subjectLine;
  const bodyHtml = [
    emailParagraph(`Hi ${params.tenantName},`),
    emailParagraph(params.message),
    params.propertyName
      ? emailInfoTable(
          [
            emailInfoRow("Property", params.propertyName),
            params.unitName ? emailInfoRow("Unit", params.unitName) : "",
          ]
            .filter(Boolean)
            .join("")
        )
      : "",
    emailParagraph("Please reply to this email if you have any questions."),
  ].join("");

  const html = renderEmailLayout({
    title: params.subjectLine,
    preheader: params.message.slice(0, 120),
    landlordName: params.landlordName,
    landlordEmail: params.landlordEmail,
    bodyHtml,
  });

  const text = [`Hi ${params.tenantName},`, "", params.message, "", params.landlordName].join(
    "\n"
  );

  return { subject, text, html };
}

export function buildPartialPaymentEmailContent(params: {
  tenantName: string;
  monthLabel: string;
  paymentAmount: string;
  paymentDate: string;
  totalDue: string;
  outstandingBalance: string;
  landlordName: string;
  landlordEmail?: string;
}): StatementEmailContent {
  const subject = `Partial Payment Received — ${params.monthLabel}`;
  const bodyHtml = [
    emailParagraph(`Hi ${params.tenantName},`),
    emailParagraph(`We recorded a partial payment toward your ${params.monthLabel} statement.`),
    emailInfoTable(
      [
        emailInfoRow("Payment amount", params.paymentAmount),
        emailInfoRow("Payment date", params.paymentDate),
        emailInfoRow("Statement total", params.totalDue),
        emailInfoRow("Remaining balance", params.outstandingBalance),
      ].join("")
    ),
    emailCallout(
      `Please arrange payment for the remaining balance of ${params.outstandingBalance} by the due date.`,
      "warning"
    ),
    emailParagraph("A receipt for this payment is attached."),
  ].join("");

  const html = renderEmailLayout({
    title: "Partial Payment Received",
    preheader: `${params.paymentAmount} received — ${params.outstandingBalance} remaining`,
    landlordName: params.landlordName,
    landlordEmail: params.landlordEmail,
    bodyHtml,
  });

  const text = [
    `Hi ${params.tenantName},`,
    "",
    `Partial payment of ${params.paymentAmount} received on ${params.paymentDate}.`,
    `Statement total: ${params.totalDue}`,
    `Remaining balance: ${params.outstandingBalance}`,
    "",
    params.landlordName,
  ].join("\n");

  return { subject, text, html };
}
