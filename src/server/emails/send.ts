import { Resend } from "resend";

type EmailPayload = {
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachmentName?: string;
};

export async function sendEmail(payload: EmailPayload) {
  if (!process.env.RESEND_API_KEY) {
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

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@yourdomain.com";

  const { data, error } = await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.body,
    ...(payload.html ? { html: payload.html } : {}),
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }

  return { success: true, id: data!.id };
}
