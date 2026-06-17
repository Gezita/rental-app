import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { DocumentCategory } from "@prisma/client";
import {
  buildPetsClause,
  buildUtilityTerms,
  formatLeaseTerm,
  type LeaseWizardInput,
} from "./lease-wizard";
import { type T776Report } from "./t776-report";

import { saveDocumentBuffer } from "@/lib/storage";

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
  return saveDocumentBuffer(pdfBytes, {
    userId: options.userId,
    category: options.category,
    fileName,
    mimeType: "application/pdf",
    propertyId: options.propertyId,
    unitId: options.unitId,
    tenantId: options.tenantId,
    notes: options.notes,
    tags: options.tags,
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
  w.draw("Ontario — prepared with Lessora", 9);
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

function formatNoticeDate(value?: Date | string | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Renders a completed, print-ready reproduction of Ontario LTB Form N4
 * (Notice to End your Tenancy Early for Non-payment of Rent).
 */
async function drawN4Notice(
  pdf: PDFDocument,
  font: PDFFont,
  fontBold: PDFFont,
  data: import("./ltb-notice-wizard").LtbNoticeWizardInput
) {
  const { computeN4RentOwing } = await import("./ltb-notice-wizard");
  const { rows, totalOwingCents } = computeN4RentOwing(data.fieldValues);

  const left = 50;
  const right = 562;
  const width = right - left;
  const ink = rgb(0.1, 0.1, 0.1);
  const muted = rgb(0.42, 0.42, 0.42);
  const lineColor = rgb(0.7, 0.7, 0.7);

  const state = { page: pdf.addPage([612, 792]), y: 754 };

  const newPage = () => {
    state.page = pdf.addPage([612, 792]);
    state.y = 754;
  };
  const ensure = (needed: number) => {
    if (state.y - needed < 56) newPage();
  };
  const text = (
    value: string,
    opts: { size?: number; bold?: boolean; x?: number; color?: typeof ink } = {}
  ) => {
    const size = opts.size ?? 10;
    state.page.drawText(value, {
      x: opts.x ?? left,
      y: state.y,
      size,
      font: opts.bold ? fontBold : font,
      color: opts.color ?? ink,
    });
  };
  const lineDown = (delta: number) => {
    state.y -= delta;
  };
  const para = (value: string, size = 10, indent = 0) => {
    for (const ln of wrapText(value, font, size, width - indent)) {
      ensure(size + 5);
      text(ln, { size, x: left + indent });
      lineDown(size + 5);
    }
  };
  const labelValue = (label: string, value: string, size = 10) => {
    ensure(size + 6);
    text(label, { size, bold: true });
    const labelWidth = fontBold.widthOfTextAtSize(label, size);
    for (const ln of wrapText(value, font, size, width - labelWidth - 6)) {
      text(ln, { size, x: left + labelWidth + 6 });
      lineDown(size + 5);
      // subsequent wrapped lines align under the value column
    }
  };
  const sectionHeading = (value: string) => {
    ensure(26);
    lineDown(8);
    text(value, { size: 11, bold: true });
    lineDown(6);
    state.page.drawLine({
      start: { x: left, y: state.y + 2 },
      end: { x: right, y: state.y + 2 },
      thickness: 0.75,
      color: lineColor,
    });
    lineDown(8);
  };

  // ── Header ──────────────────────────────────────────────────────────────
  text("Notice to End your Tenancy Early", { size: 15, bold: true });
  lineDown(18);
  text("for Non-payment of Rent", { size: 15, bold: true });
  lineDown(18);
  text("Form N4 — Residential Tenancies Act, 2006", { size: 9, color: muted });
  lineDown(11);
  text("Landlord and Tenant Board (Ontario)", { size: 9, color: muted });
  lineDown(14);

  // ── Parties / unit ──────────────────────────────────────────────────────
  labelValue("To (Tenant): ", data.tenantName);
  labelValue("From (Landlord): ", data.landlordName);
  labelValue("Address of the Rental Unit: ", data.propertyAddress || `${data.propertyName}, ${data.unitName}`);

  // ── Reason ──────────────────────────────────────────────────────────────
  sectionHeading("Reason for this Notice");
  para(
    "You are getting this notice because you have not paid the rent you owe. The total amount of rent you owe is shown below."
  );
  lineDown(2);
  labelValue("Total amount of rent you owe: ", formatCents(totalOwingCents), 11);

  sectionHeading("Deadline to Pay or Move Out");
  labelValue("Termination date: ", formatNoticeDate(data.terminationDate));
  para(
    "You must pay the total amount of rent you owe or move out of the rental unit by the termination date. If you pay the full amount you owe, or you move out, by this date, this notice is void and you do not have to move out."
  );

  // ── Calculation table ───────────────────────────────────────────────────
  sectionHeading("How the Amount Owing Was Calculated");

  const cols = [
    { label: "Rent period (from)", w: 0.24, align: "left" as const },
    { label: "to", w: 0.2, align: "left" as const },
    { label: "Rent charged", w: 0.19, align: "right" as const },
    { label: "Rent paid", w: 0.18, align: "right" as const },
    { label: "Rent owing", w: 0.19, align: "right" as const },
  ];
  const colX: number[] = [];
  let acc = left;
  for (const c of cols) {
    colX.push(acc);
    acc += c.w * width;
  }
  colX.push(right);
  const rowHeight = 18;

  const drawTableRow = (cells: string[], opts: { bold?: boolean; fill?: boolean } = {}) => {
    ensure(rowHeight + 2);
    const top = state.y + 4;
    const bottom = top - rowHeight;
    if (opts.fill) {
      state.page.drawRectangle({
        x: left,
        y: bottom,
        width,
        height: rowHeight,
        color: rgb(0.95, 0.93, 0.9),
      });
    }
    // cell borders
    state.page.drawRectangle({
      x: left,
      y: bottom,
      width,
      height: rowHeight,
      borderColor: lineColor,
      borderWidth: 0.5,
    });
    for (let i = 1; i < colX.length - 1; i++) {
      state.page.drawLine({
        start: { x: colX[i], y: top },
        end: { x: colX[i], y: bottom },
        thickness: 0.5,
        color: lineColor,
      });
    }
    cells.forEach((cell, i) => {
      const align = cols[i].align;
      const size = 9;
      const cellFont = opts.bold ? fontBold : font;
      const textWidth = cellFont.widthOfTextAtSize(cell, size);
      const x =
        align === "right" ? colX[i + 1] - 4 - textWidth : colX[i] + 4;
      state.page.drawText(cell, {
        x,
        y: bottom + 5,
        size,
        font: cellFont,
        color: ink,
      });
    });
    state.y = bottom - 2;
  };

  drawTableRow(
    cols.map((c) => c.label),
    { bold: true, fill: true }
  );
  if (rows.length === 0) {
    drawTableRow(["—", "—", "—", "—", "—"]);
  } else {
    for (const row of rows) {
      drawTableRow([
        formatNoticeDate(row.from),
        formatNoticeDate(row.to),
        formatCents(row.chargedCents),
        formatCents(row.paidCents),
        formatCents(row.owingCents),
      ]);
    }
  }
  // total row
  ensure(rowHeight + 2);
  {
    const top = state.y + 4;
    const bottom = top - rowHeight;
    state.page.drawRectangle({
      x: left,
      y: bottom,
      width,
      height: rowHeight,
      borderColor: lineColor,
      borderWidth: 0.5,
    });
    state.page.drawText("Total amount of rent owing", {
      x: colX[0] + 4,
      y: bottom + 5,
      size: 9,
      font: fontBold,
      color: ink,
    });
    const totalStr = formatCents(totalOwingCents);
    state.page.drawText(totalStr, {
      x: right - 4 - fontBold.widthOfTextAtSize(totalStr, 9),
      y: bottom + 5,
      size: 9,
      font: fontBold,
      color: ink,
    });
    state.y = bottom - 2;
  }

  // ── Signature ───────────────────────────────────────────────────────────
  sectionHeading("Signature");
  const roleLabel =
    data.fieldValues.signerRole === "representative" ? "Representative" : "Landlord";
  labelValue("Name: ", data.fieldValues.signerName || data.landlordName);
  labelValue("Signing as: ", roleLabel);
  labelValue("Phone: ", data.fieldValues.signerPhone || "");
  labelValue("Date signed: ", formatNoticeDate(data.serviceDate));
  lineDown(14);
  ensure(20);
  text("Signature: ", { bold: true });
  state.page.drawLine({
    start: { x: left + 60, y: state.y - 1 },
    end: { x: left + 280, y: state.y - 1 },
    thickness: 0.75,
    color: lineColor,
  });
  lineDown(16);

  // ── Address for service ─────────────────────────────────────────────────
  sectionHeading("Address for Service");
  para("This is where the tenant can give documents or payment to the landlord.");
  lineDown(2);
  for (const ln of (data.fieldValues.serviceAddress || "").split(/\r?\n/)) {
    if (ln.trim()) para(ln.trim());
  }
  if (data.fieldValues.serviceEmail) labelValue("Email: ", data.fieldValues.serviceEmail);

  // ── Footer note ─────────────────────────────────────────────────────────
  lineDown(10);
  ensure(30);
  para(
    "This form was prepared with Lessora as a reproduction of LTB Form N4. Confirm the current version and complete the Certificate of Service at tribunalsontario.ca/ltb/forms before serving.",
    8,
  );
}

export async function generateLtbNoticePdf(
  data: import("./ltb-notice-wizard").LtbNoticeWizardInput & {
    userId: string;
    propertyId: string;
    unitId?: string;
    tenantId?: string;
  }
) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  if (data.formCode.toUpperCase() === "N4") {
    await drawN4Notice(pdf, font, fontBold, data);
  } else {
    const { buildLtbNoticeFieldLines } = await import("./ltb-notice-wizard");
    const page = pdf.addPage([612, 792]);
    const w = createPdfWriter(pdf, page, font, fontBold);

    w.draw(`FORM ${data.formCode}`, 14, true);
    w.draw(data.formName, 12, true);
    w.draw("Landlord and Tenant Board — Ontario (Draft prepared with Lessora)", 9);
    w.draw(
      "Review against the official LTB PDF before serving. Official blank forms: tribunalsontario.ca/ltb/forms/",
      9
    );
    w.y -= 8;

    w.draw("Landlord", 13, true);
    w.draw(`Name: ${data.landlordName}`);
    if (data.landlordAddress) w.draw(`Address: ${data.landlordAddress}`);
    if (data.landlordEmail) w.draw(`Email: ${data.landlordEmail}`);
    if (data.landlordPhone) w.draw(`Phone: ${data.landlordPhone}`);
    w.y -= 4;

    w.draw("Tenant", 13, true);
    w.draw(`Name: ${data.tenantName}`);
    if (data.tenantEmail) w.draw(`Email: ${data.tenantEmail}`);
    if (data.tenantPhone) w.draw(`Phone: ${data.tenantPhone}`);
    w.y -= 4;

    w.draw("Rental Unit", 13, true);
    w.draw(`Property: ${data.propertyName}`);
    w.draw(`Unit: ${data.unitName}`);
    w.draw(`Address: ${data.propertyAddress}`);
    w.y -= 4;

    w.draw("Notice Details", 13, true);
    w.draw(
      `Date notice given: ${data.serviceDate.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`
    );
    if (data.terminationDate) {
      w.draw(
        `Termination / effective date: ${data.terminationDate.toLocaleDateString("en-CA", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`
      );
    } else if (data.effectiveDate) {
      w.draw(
        `Effective date: ${data.effectiveDate.toLocaleDateString("en-CA", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`
      );
    }

    for (const line of buildLtbNoticeFieldLines(data.formCode, data.fieldValues)) {
      w.drawParagraph(line);
    }

    if (data.notes?.trim()) {
      w.y -= 4;
      w.draw("Additional notes", 12, true);
      w.drawParagraph(data.notes.trim());
    }

    w.y -= 8;
    w.draw("Service & signatures", 13, true);
    w.drawParagraph(
      "Serve this notice according to the Residential Tenancies Act. Keep proof of service. Both parties should retain signed copies."
    );
    w.y -= 20;
    w.draw("Landlord signature: _________________________    Date: ______________");
    w.y -= 20;
    w.draw("Tenant signature: ___________________________    Date: ______________");
  }

  const pdfBytes = await pdf.save();
  const fileName = `${data.formCode}-${data.unitName.replace(/[^a-zA-Z0-9_-]/g, "_")}-${data.serviceDate.toISOString().slice(0, 10)}.pdf`;
  return savePdfDocument(pdfBytes, fileName, {
    userId: data.userId,
    category: "ltb_notice",
    propertyId: data.propertyId,
    unitId: data.unitId,
    tenantId: data.tenantId,
    notes: `${data.formCode} notice for ${data.tenantName}`,
    tags: data.formCode,
  });
}

export async function generateStandardLease2229ePdf(
  data: import("./standard-lease-2229e").StandardLease2229eInput & {
    userId: string;
    propertyId: string;
    unitId: string;
    tenantId: string;
  }
) {
  const { build2229eUtilitySummary, buildServicesIncluded, format2229eTerm } = await import(
    "./standard-lease-2229e"
  );
  const { buildPetsClause } = await import("./lease-wizard");

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([612, 792]);
  const w = createPdfWriter(pdf, page, font, fontBold);

  w.draw("RESIDENTIAL TENANCY AGREEMENT", 16, true);
  w.draw("Ontario Standard Lease — Form 2229E (December 2020) — Draft", 11, true);
  w.draw(
    "Copy these details into the official fillable PDF at forms.mgcs.gov.on.ca. Do not alter pre-printed terms on the official form.",
    9
  );
  w.y -= 8;

  w.draw("Part 1 — Parties to the Agreement", 13, true);
  w.draw(`Landlord: ${data.landlordName}`);
  if (data.landlordAddress) w.draw(`Landlord address: ${data.landlordAddress}`);
  w.draw(`Tenant(s): ${data.tenantName}`);
  w.y -= 4;

  w.draw("Part 2 — Rental Unit", 13, true);
  w.draw(`Address: ${data.propertyAddress}`);
  w.draw(`Unit / designation: ${data.unitName} (${data.propertyName})`);
  w.y -= 4;

  w.draw("Part 3 — Contact Information", 13, true);
  if (data.landlordEmail) w.draw(`Landlord email: ${data.landlordEmail}`);
  if (data.landlordPhone) w.draw(`Landlord phone: ${data.landlordPhone}`);
  if (data.tenantEmail) w.draw(`Tenant email: ${data.tenantEmail}`);
  if (data.tenantPhone) w.draw(`Tenant phone: ${data.tenantPhone}`);
  if (data.emergencyContactName) {
    w.draw(`Emergency contact: ${data.emergencyContactName}${data.emergencyContactPhone ? ` — ${data.emergencyContactPhone}` : ""}`);
  }
  w.y -= 4;

  w.draw("Part 4 — Term of Tenancy Agreement", 13, true);
  w.draw(
    `Start date: ${data.leaseStartDate.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`
  );
  w.drawParagraph(format2229eTerm(data.leaseEndDate));
  w.y -= 4;

  w.draw("Part 5 — Rent", 13, true);
  w.draw(`Total rent (lawful rent): ${formatCents(data.rentAmountCents)}`, 11, true);
  w.draw(`Rent due day: ${data.rentDueDay} of each month`);
  if (data.rentPaymentMethod?.trim()) {
    w.draw(`Payment method: ${data.rentPaymentMethod.trim()}`);
  }
  if (data.partialRentCents && data.partialRentCents > 0) {
    w.drawParagraph(
      `Partial rent during first period: ${formatCents(data.partialRentCents)}${
        data.partialRentStartDate && data.partialRentEndDate
          ? ` (${data.partialRentStartDate.toLocaleDateString("en-CA")} to ${data.partialRentEndDate.toLocaleDateString("en-CA")})`
          : ""
      }`
    );
  }
  if (data.rentDepositCents && data.rentDepositCents > 0) {
    w.draw(`Rent deposit collected: ${formatCents(data.rentDepositCents)}`);
  }
  if (data.keyDepositCents && data.keyDepositCents > 0) {
    w.draw(`Key deposit: ${formatCents(data.keyDepositCents)}`);
  }
  w.y -= 4;

  w.draw("Part 6 — Services and Utilities", 13, true);
  w.draw("Services included in rent:", 11, true);
  for (const service of buildServicesIncluded(data)) {
    w.drawParagraph(`• ${service}`);
  }
  w.draw("Utilities — payment responsibility:", 11, true);
  for (const line of build2229eUtilitySummary(data)) {
    w.drawParagraph(line);
  }
  w.y -= 4;

  w.draw("Part 7 — Additional Terms", 13, true);
  w.drawParagraph(buildPetsClause(data.petsAllowed));
  w.drawParagraph(
    data.smokingAllowed
      ? "Smoking: permitted where allowed by law and building rules."
      : "Smoking: not permitted in the rental unit unless otherwise agreed in writing."
  );
  if (data.additionalTerms?.trim()) {
    w.drawParagraph(data.additionalTerms.trim());
  } else {
    w.drawParagraph("None beyond the standard terms of Form 2229E.");
  }
  w.y -= 8;

  w.draw("Signatures", 13, true);
  w.drawParagraph(
    "Landlord and tenant acknowledge this draft summarizes the tenancy. Sign the official Ontario Standard Lease (2229E) for a binding agreement."
  );
  w.y -= 20;
  w.draw("Landlord signature: _________________________    Date: ______________");
  w.y -= 20;
  w.draw("Tenant signature: ___________________________    Date: ______________");

  const pdfBytes = await pdf.save();
  const fileName = `2229e-${data.unitName.replace(/[^a-zA-Z0-9_-]/g, "_")}-${data.leaseStartDate.toISOString().slice(0, 10)}.pdf`;
  return savePdfDocument(pdfBytes, fileName, {
    userId: data.userId,
    category: "lease",
    propertyId: data.propertyId,
    unitId: data.unitId,
    tenantId: data.tenantId,
    notes: `Ontario Standard Lease (2229E) draft for ${data.tenantName}`,
    tags: "2229e",
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
  w.draw("Tenant onboarding package — prepared with Lessora", 9);
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
