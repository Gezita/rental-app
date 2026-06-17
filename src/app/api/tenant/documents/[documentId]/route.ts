import { NextResponse } from "next/server";
import { cloudDataBlockedResponse } from "@/lib/cloud-guard";
import { isLocalDataOnlyDeploy } from "@/lib/deploy-config";
import { getSessionTenantId } from "@/lib/tenant-auth";
import { prisma } from "@/lib/db";
import { getDocumentPresignedUrl, readDocumentFile } from "@/lib/files";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  if (isLocalDataOnlyDeploy()) return cloudDataBlockedResponse();

  const tenantId = await getSessionTenantId();
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;

  const document = await prisma.document.findFirst({
    where: { id: documentId, tenantId },
  });

  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const presignedUrl = await getDocumentPresignedUrl(document.filePath);
    if (presignedUrl) {
      return NextResponse.redirect(presignedUrl);
    }

    const buffer = await readDocumentFile(document.filePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.fileMimeType,
        "Content-Disposition": `inline; filename="${document.fileName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
