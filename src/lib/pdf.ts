import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "./db";
import type { DocumentCategory } from "@prisma/client";
import {
  buildPetsClause,
  buildUtilityTerms,
  formatLeaseTerm,
  type LeaseWizardInput,
} from "./lease-wizard";
import { type T776Report } from "./t776-report";

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

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

type PdfWriter = {
  page: PDFPage;
  y: number;
  font: PDFFont;
  fontBold: PDFFont;
  draw: (text: string, size?: number, bold?: boolean, indent?: number) => void;
  drawParagraph: (text: string, size?: number, indent?: number) => void;
  ensureSpace: (needed: number) => void;
};

function createPdfWriter(pdf: PDFDocument, page: PDFPage, font: PDFFont, fontBold: PDFFont): PdfWriter {
  const margin = 50;
  const maxWidth = 512;
  const state = { page, y: 740 };

  const ensureSpace = (needed: number) => {
    if (state.y - needed < 50) {
      state.page = pdf.addPage([612, 792]);
      state.y = 740;
    }
  };

  const writer: PdfWriter = {
    get page() {
      return state.page;
    },
    set page(p: PDFPage) {
      state.page = p;
    },
    get y() {
      return state.y;
    },
    set y(v: number) {
      state.y = v;
    },
    font,
    fontBold,
    ensureSpace,
    draw(text, size = 11, bold = false, indent = 0) {
      ensureSpace(size + 12);
      state.page.drawText(text, {
        x: margin + indent,
        y: state.y,
        size,
        font: bold ? fontBold : font,
        color: rgb(0.1, 0.1, 0.1),
      });
      state.y -= size + 8;
    },
    drawParagraph(text, size = 10, indent = 0) {
      for (const line of wrapText(text, font, size, maxWidth - indent)) {
        writer.draw(line, size, false, indent);
      }
    },
  };

  return writer;
}

async function savePdfDocument(
  pdfBytes: Uint8Array,
  fileName: string,
  options: {
    userId: string;
    category: DocumentCategory;
    propertyId?: string;
    unitId?: string;
    tenantId?: string;
    notes?: string;
    tags?: string;
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
      tags: options.tags,
    },
  });
}

export async function generateLeasePdf(
  data: LeaseWizardInput & {
    userId: string;
    propertyId: string;
    unitId: string;
    tenantId: string;
  }
) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([612, 792]);
  const w = createPdfWriter(pdf, page, font, fontBold);

  const rent = formatCents(data.rentAmountCents);
  const deposit =
    data.securityDepositCents && data.securityDepositCents > 0
      ? formatCents(data.securityDepositCents)
      : "None specified";

  w.draw("RESIDENTIAL TENANCY AGREEMENT", 16, true);
  w.draw("Ontario — prepared with Zigglo", 9);
  w.draw(
    "This agreement is for landlord records. For new tenancies, use the Ontario Standard Lease (Form 2229E) where required by the RTA.",
    9
  );
  w.y -= 4;

  w.draw("Parties", 13, true);
  w.draw(`Landlord: ${data.landlordName}`, 11, true);
  if (data.landlordEmail) w.draw(`Email: ${data.landlordEmail}`);
  w.draw(`Tenant: ${data.tenantName}`, 11, true);
  if (data.tenantEmail) w.draw(`Email: ${data.tenantEmail}`);
  if (data.tenantPhone) w.draw(`Phone: ${data.tenantPhone}`);
  w.y -= 4;

  w.draw("Rental Unit", 13, true);
  w.draw(`Property: ${data.propertyName}`);
  w.draw(`Address: ${data.propertyAddress}`);
  w.draw(`Unit: ${data.unitName}`);
  w.y -= 4;

  w.draw("Term", 13, true);
  w.draw(
    `Start date: ${data.leaseStartDate.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`
  );
  w.drawParagraph(formatLeaseTerm(data.leaseEndDate));
  w.y -= 4;

  w.draw("Rent", 13, true);
  w.draw(`Monthly rent: ${rent}`, 11, true);
  w.draw(`Due on day ${data.rentDueDay} of each month.`);
  if (data.lastMonthRentDeposit) {
    w.drawParagraph(
      "Last month's rent deposit collected in accordance with the Residential Tenancies Act."
    );
  }
  w.draw(`Rent deposit (security): ${deposit}`);
  w.y -= 4;

  w.draw("Utilities & Services", 13, true);
  for (const line of buildUtilityTerms(data.utilityRules)) {
    w.drawParagraph(line);
  }
  w.draw(
    `Parking: ${data.parkingIncluded ? "Included" : "Not included unless otherwise agreed."}`
  );
  w.y -= 4;

  w.draw("Rules", 13, true);
  w.drawParagraph(buildPetsClause(data.petsAllowed));
  w.drawParagraph(
    data.smokingAllowed
      ? "Smoking permitted where allowed by law and building rules."
      : "No smoking in the rental unit or common areas unless otherwise agreed in writing."
  );
  w.y -= 4;

  if (data.additionalTerms?.trim()) {
    w.draw("Additional Terms", 13, true);
    w.drawParagraph(data.additionalTerms.trim());
    w.y -= 4;
  }

  w.draw("Signatures", 13, true);
  w.drawParagraph(
    "Landlord and tenant acknowledge the terms above. Each party should retain a signed copy."
  );
  w.y -= 24;
  w.draw("Landlord signature: _________________________    Date: ______________");
  w.y -= 24;
  w.draw("Tenant signature: ___________________________    Date: ______________");

  const pdfBytes = await pdf.save();
  const safeUnit = data.unitName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `lease-${safeUnit}-${data.leaseStartDate.toISOString().slice(0, 10)}.pdf`;
  return savePdfDocument(pdfBytes, fileName, {
    userId: data.userId,
    category: "lease",
    propertyId: data.propertyId,
    unitId: data.unitId,
    tenantId: data.tenantId,
    notes: `Lease agreement for ${data.tenantName}`,
  });
}

type OnboardingPdfData = {
  userId: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  landlordName: string;
  landlordEmail?: string;
  propertyName: string;
  propertyAddress: string;
  unitName: string;
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  moveInDate: Date;
  rentAmountCents: number;
  rentDueDay: number;
  paymentInstructions?: string;
  utilityLines: string[];
};

export async function generateOnboardingPdf(data: OnboardingPdfData) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([612, 792]);
  const w = createPdfWriter(pdf, page, font, fontBold);

  const moveInLabel = data.moveInDate.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  w.draw("WELCOME TO YOUR NEW HOME", 16, true);
  w.draw("Tenant onboarding package — prepared with Zigglo", 9);
  w.y -= 8;

  w.draw(`Dear ${data.tenantName},`, 11, true);
  w.drawParagraph(
    `Welcome! We are pleased to confirm your move-in to ${data.unitName} at ${data.propertyName}. This document summarizes key information for your tenancy. Please keep it for your records and contact us with any questions before or after move-in.`
  );
  w.y -= 4;

  w.draw("Your rental unit", 13, true);
  w.draw(`Property: ${data.propertyName}`);
  w.draw(`Address: ${data.propertyAddress}`);
  w.draw(`Unit: ${data.unitName}`);
  w.draw(`Move-in date: ${moveInLabel}`, 11, true);
  w.y -= 4;

  w.draw("Rent & payments", 13, true);
  w.draw(`Monthly rent: ${formatCents(data.rentAmountCents)}`, 11, true);
  w.draw(`Rent is due on day ${data.rentDueDay} of each month.`);
  if (data.paymentInstructions?.trim()) {
    w.drawParagraph(`How to pay: ${data.paymentInstructions.trim()}`);
  } else {
    w.drawParagraph(
      "Payment instructions will be provided on your monthly statements. Set up e-transfer or your preferred method with your landlord before your first due date."
    );
  }
  w.y -= 4;

  w.draw("Utilities & services", 13, true);
  for (const line of data.utilityLines) {
    w.drawParagraph(line);
  }
  w.y -= 4;

  w.draw("Important reminders", 13, true);
  w.drawParagraph(
    "Report maintenance issues promptly so they can be addressed. Ontario tenants have rights under the Residential Tenancies Act — your landlord will provide any required notices in writing."
  );
  w.drawParagraph(
    "A formal lease agreement (including the Ontario Standard Lease where required) should be signed separately. Monthly billing statements will be sent for rent and any shared utility charges."
  );
  w.y -= 4;

  w.draw("Landlord contact", 13, true);
  w.draw(data.landlordName, 11, true);
  if (data.landlordEmail) w.draw(`Email: ${data.landlordEmail}`);
  if (data.tenantEmail) w.draw(`Your email on file: ${data.tenantEmail}`);
  if (data.tenantPhone) w.draw(`Your phone on file: ${data.tenantPhone}`);
  w.y -= 8;

  w.drawParagraph(
    "We look forward to a positive tenancy. Welcome again — and please reach out if you need anything before move-in day."
  );

  const pdfBytes = await pdf.save();
  const safeTenant = data.tenantName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `onboarding-${safeTenant}-${data.moveInDate.toISOString().slice(0, 10)}.pdf`;
  return savePdfDocument(pdfBytes, fileName, {
    userId: data.userId,
    category: "other",
    propertyId: data.propertyId,
    unitId: data.unitId,
    tenantId: data.tenantId,
    notes: `Onboarding welcome package for ${data.tenantName}`,
    tags: "onboarding",
  });
}

export async function generateT776Pdf(
  report: T776Report,
  userId: string
) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([612, 792]);
  const w = createPdfWriter(pdf, page, font, fontBold);

  w.draw("RENTAL INCOME TAX SUMMARY", 16, true);
  w.draw(`Prepared for CRA Form T776 — Tax Year ${report.year}`, 11, true);
  w.draw(`Landlord: ${report.landlordName}`);
  w.draw(`Generated: ${report.generatedAt.toLocaleDateString("en-CA")}`);
  w.draw(
    "Summary only — verify all amounts with your accountant before filing.",
    9
  );
  w.y -= 8;

  const drawProperty = (title: string, p: {
    grossRentalIncomeCents: number;
    propertyTaxCents: number;
    insuranceCents: number;
    mortgageInterestCents: number;
    maintenanceCents: number;
    netUtilityExpenseCents: number;
    utilityBillsCents: number;
    utilityRecoveriesCents: number;
    totalExpensesCents: number;
    netIncomeCents: number;
    address?: string;
  }) => {
    w.ensureSpace(200);
    w.draw(title, 13, true);
    if (p.address) w.draw(p.address, 10);
    w.y -= 4;
    w.draw("Income", 11, true);
    w.draw(`  Line 8141 — Gross rents received: ${formatCents(p.grossRentalIncomeCents)}`);
    w.y -= 4;
    w.draw("Expenses", 11, true);
    w.draw(`  Line 9180 — Property taxes: ${formatCents(p.propertyTaxCents)}`);
    w.draw(`  Line 9200 — Insurance: ${formatCents(p.insuranceCents)}`);
    w.draw(`  Line 8710 — Mortgage interest: ${formatCents(p.mortgageInterestCents)}`);
    w.draw(`  Line 9281 — Repairs & maintenance: ${formatCents(p.maintenanceCents)}`);
    w.draw(
      `  Line 9270 — Utilities (net of tenant recoveries): ${formatCents(p.netUtilityExpenseCents)}`
    );
    w.draw(`    Utility bills: ${formatCents(p.utilityBillsCents)}`, 9, false, 12);
    w.draw(
      `    Recovered on statements: ${formatCents(p.utilityRecoveriesCents)}`,
      9,
      false,
      12
    );
    w.draw(`  Total expenses: ${formatCents(p.totalExpensesCents)}`, 11, true);
    w.draw(`  Net rental income: ${formatCents(p.netIncomeCents)}`, 12, true);
    w.y -= 8;
  };

  for (const property of report.properties) {
    drawProperty(property.propertyName, property);
  }

  if (report.properties.length > 1) {
    drawProperty("Portfolio Total", report.totals);
  }

  const pdfBytes = await pdf.save();
  const fileName = `T776-summary-${report.year}.pdf`;
  return savePdfDocument(pdfBytes, fileName, {
    userId,
    category: "tax_report",
    notes: `T776 rental income summary for ${report.year}`,
    tags: `t776-${report.year}`,
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
