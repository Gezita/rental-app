import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Verifies a DocuSign Connect HMAC signature.
 *
 * DocuSign signs the raw request body with each configured Connect HMAC key and
 * sends the result in `X-DocuSign-Signature-1`, `-2`, ... (base64 HMAC-SHA256).
 * Multiple headers exist to support key rotation; a match on any is valid.
 */
function isValidSignature(rawBody: string, headers: Headers, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();

  for (let i = 1; i <= 5; i += 1) {
    const provided = headers.get(`x-docusign-signature-${i}`);
    if (!provided) continue;
    let providedBuf: Buffer;
    try {
      providedBuf = Buffer.from(provided, "base64");
    } catch {
      continue;
    }
    if (providedBuf.length === expected.length && timingSafeEqual(providedBuf, expected)) {
      return true;
    }
  }

  return false;
}

export async function POST(request: Request) {
  // Read the raw body once — HMAC must be computed over the exact bytes.
  const rawBody = await request.text();

  const secret = process.env.DOCUSIGN_CONNECT_HMAC_KEY;
  if (!secret) {
    // Fail closed: an unauthenticated webhook can forge "signed" documents.
    console.error(
      "[docusign webhook] DOCUSIGN_CONNECT_HMAC_KEY is not set — rejecting webhook"
    );
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  if (!isValidSignature(rawBody, request.headers, secret)) {
    console.warn("[docusign webhook] invalid or missing signature — rejecting");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const envelopeId =
      payload?.data?.envelopeId ||
      payload?.envelopeId ||
      payload?.data?.envelopeSummary?.envelopeId;

    if (!envelopeId || typeof envelopeId !== "string") {
      return NextResponse.json({ received: true });
    }

    const status = payload?.data?.envelopeSummary?.status || payload?.status;
    if (status === "completed") {
      await prisma.document.updateMany({
        where: { docusignEnvelopeId: envelopeId },
        data: {
          signatureStatus: "completed",
          signedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[docusign webhook] processing error:", e);
    return NextResponse.json({ received: true });
  }
}
