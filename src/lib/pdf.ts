import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "./db";
import type { DocumentCategory } from "@prisma/client";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

type LineItem = {
  description: string;
  amountCents: number;
  note?: string;
};

type StatementPdfData = {
  userId: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  statementId: string;
  landlordName: string;
  propertyAddress: string;
  unitName: string;
  tenantName: string;
  statementNumber: string;
  statementMonth: string;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  totalDueCents: number;
  paymentInstructions?: string;
  notes?: string;
};

type ReceiptPdfData = {
  userId: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  paymentId: string;
  receiptId: string;
  landlordName: string;
  propertyAddress: string;
  unitName: string;
  tenantName: string;
  receiptNumber: string;
  statementNumber: string;
  paymentAmountCents: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
};

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

async function savePdfDocument(
  pdfBytes: Uint8Array,
  fileName: string,
  options: {
    userId: string;
    category: DocumentCategory;
    propertyId: string;
    unitId: string;
    tenantId: string;
    notes?: string;
  }
) {
  const userDir = path.join(process.cwd(), UPLOAD_DIR, options.userId);
  await mkdir(userDir, { recursive: true });
  const uniqueName = `${Date.now()}-${fileName}`;
  const filePath = path.join(userDir, uniqueName);
  await writeFile(filePath, pdfBytes);

  return prisma.document.create({
    data: {
      userId: options.userId,
      propertyId: options.propertyId,
      unitId: options.unitId,
      tenantId: options.tenantId,
      category: options.category,
      fileName,
      filePath: path.join(UPLOAD_DIR, options.userId, uniqueName),
      fileMimeType: "application/pdf",
      fileSizeBytes: pdfBytes.length,
      notes: options.notes,
    },
  });
}

export async function generateStatementPdf(data: StatementPdfData) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([612, 792]);
  let y = 740;

  const draw = (text: string, size = 11, bold = false) => {
    page.drawText(text, {
      x: 50,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= size + 8;
  };

  draw("MONTHLY STATEMENT", 18, true);
  draw(`From: ${data.landlordName}`, 12, true);
  draw(`Property: ${data.propertyAddress}`);
  draw(`Unit: ${data.unitName}`);
  draw(`Tenant: ${data.tenantName}`);
  y -= 8;
  draw(`Statement #: ${data.statementNumber}`);
  draw(`Period: ${data.statementMonth}`);
  draw(`Issue Date: ${data.issueDate}`);
  draw(`Due Date: ${data.dueDate}`, 12, true);
  y -= 12;

  draw("Line Items", 13, true);
  for (const item of data.lineItems) {
    draw(`${item.description} — ${formatCents(item.amountCents)}`);
    if (item.note) draw(`  ${item.note}`, 9);
  }

  y -= 8;
  draw(`TOTAL DUE: ${formatCents(data.totalDueCents)}`, 14, true);

  if (data.paymentInstructions) {
    y -= 8;
    draw("Payment Instructions", 12, true);
    draw(data.paymentInstructions);
  }

  if (data.notes) {
    y -= 8;
    draw("Notes", 12, true);
    draw(data.notes);
  }

  const pdfBytes = await pdf.save();
  const fileName = `${data.statementNumber}.pdf`;
  return savePdfDocument(pdfBytes, fileName, {
    userId: data.userId,
    category: "statement",
    propertyId: data.propertyId,
    unitId: data.unitId,
    tenantId: data.tenantId,
    notes: `Statement PDF for ${data.statementNumber}`,
  });
}

export async function generateReceiptPdf(data: ReceiptPdfData) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([612, 792]);
  let y = 740;

  const draw = (text: string, size = 11, bold = false) => {
    page.drawText(text, {
      x: 50,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= size + 8;
  };

  draw("PAYMENT RECEIPT", 18, true);
  draw(`From: ${data.landlordName}`, 12, true);
  draw(`Property: ${data.propertyAddress}`);
  draw(`Unit: ${data.unitName}`);
  draw(`Tenant: ${data.tenantName}`);
  y -= 8;
  draw(`Receipt #: ${data.receiptNumber}`);
  draw(`Statement Paid: ${data.statementNumber}`);
  draw(`Amount: ${formatCents(data.paymentAmountCents)}`, 13, true);
  draw(`Payment Date: ${data.paymentDate}`);
  draw(`Payment Method: ${data.paymentMethod}`);

  if (data.notes) {
    y -= 8;
    draw("Notes", 12, true);
    draw(data.notes);
  }

  const pdfBytes = await pdf.save();
  const fileName = `${data.receiptNumber}.pdf`;
  return savePdfDocument(pdfBytes, fileName, {
    userId: data.userId,
    category: "receipt",
    propertyId: data.propertyId,
    unitId: data.unitId,
    tenantId: data.tenantId,
    notes: `Receipt PDF for ${data.receiptNumber}`,
  });
}
