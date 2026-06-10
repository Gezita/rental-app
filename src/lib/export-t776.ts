import { saveDocumentBuffer } from "@/lib/storage";
import { buildT776Report } from "@/lib/t776-report";
import { fillT776FormPdf } from "@/lib/fill-t776-form";

export async function exportT776ForUser(userId: string, year: number) {
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid tax year");
  }

  const report = await buildT776Report(userId, year);
  const buffer = await fillT776FormPdf(report, userId);
  const fileName = `T776-${year}.pdf`;

  const doc = await saveDocumentBuffer(buffer, {
    userId,
    category: "tax_report",
    fileName,
    mimeType: "application/pdf",
    notes: `CRA Form T776 rental income for ${year}`,
    tags: `t776-${year}`,
  });

  return {
    buffer,
    fileName: doc.fileName,
    documentId: doc.id,
  };
}
