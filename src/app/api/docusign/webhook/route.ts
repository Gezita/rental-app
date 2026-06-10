import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
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
