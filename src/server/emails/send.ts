type EmailPayload = {
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachmentName?: string;
};

/** Dev stub — replace with Resend/SMTP in production. */
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
