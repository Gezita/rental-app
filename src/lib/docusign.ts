export function isDocuSignConfigured() {
  return Boolean(
    process.env.DOCUSIGN_INTEGRATION_KEY &&
      process.env.DOCUSIGN_ACCOUNT_ID &&
      process.env.DOCUSIGN_USER_ID &&
      process.env.DOCUSIGN_PRIVATE_KEY
  );
}

export function isStripeIntegrationConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export type DocuSignRecipient = {
  name: string;
  email: string;
  role: "landlord" | "tenant";
  routingOrder: number;
};

export type CreateLeaseEnvelopeInput = {
  documentId: string;
  documentName: string;
  pdfBytes: Buffer;
  landlord: DocuSignRecipient;
  tenant: DocuSignRecipient;
};

export async function createLeaseSigningEnvelope(
  input: CreateLeaseEnvelopeInput
): Promise<{ envelopeId: string }> {
  if (!isDocuSignConfigured()) {
    throw new Error(
      "DocuSign is not configured. Add API credentials under Integrations or in your environment."
    );
  }

  // JWT auth + envelope creation would run here in production.
  // For now we simulate an envelope id so the UI flow can be tested end-to-end.
  const envelopeId = `demo-${input.documentId}-${Date.now()}`;
  return { envelopeId };
}

export async function getDocuSignEnvelopeStatus(envelopeId: string): Promise<"pending" | "completed"> {
  if (!isDocuSignConfigured()) return "pending";
  void envelopeId;
  return "pending";
}
