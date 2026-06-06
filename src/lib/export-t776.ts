import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { buildT776Report } from "@/lib/t776-report";
import { fillT776FormPdf } from "@/lib/fill-t776-form";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function exportT776ForUser(userId: string, year: number) {
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid tax year");
  }

  const report = await buildT776Report(userId, year);
  const buffer = await fillT776FormPdf(report, userId);
  const fileName = `T776-${year}.pdf`;

  const userDir = path.join(process.cwd(), UPLOAD_DIR, userId);
  await mkdir(userDir, { recursive: true });
  const uniqueName = `${Date.now()}-${fileName}`;
  const filePath = path.join(userDir, uniqueName);
  await writeFile(filePath, buffer);

  const doc = await prisma.document.create({
    data: {
      userId,
      category: "tax_report",
      fileName,
      filePath: path.join(UPLOAD_DIR, userId, uniqueName),
      fileMimeType: "application/pdf",
      fileSizeBytes: buffer.length,
      notes: `CRA Form T776 rental income for ${year}`,
      tags: `t776-${year}`,
    },
  });

  return {
    buffer,
    fileName: doc.fileName,
    documentId: doc.id,
  };
}
