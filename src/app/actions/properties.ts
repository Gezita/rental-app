"use server";

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isReasonableBillCents } from "@/lib/money";
import { requireProperty, requireUnit, requireTenant } from "@/lib/ownership";
import {
  MAX_XLSX_UPLOAD_BYTES,
  UTILITY_TYPES,
  zCents,
  zCheckbox,
  zDate,
  zMonth,
  zOptionalCents,
  zOptionalDate,
  zOptionalEmail,
  zOptionalString,
  zPercentage,
  zRentDueDay,
  zRequiredString,
  zUtilityType,
  zYear,
} from "@/lib/validation";

type SpreadsheetUtilityType = "gas" | "water" | "electricity" | "internet" | "other";
type DbClient = Prisma.TransactionClient | typeof prisma;

// ── Schemas ──────────────────────────────────────────────────────────────────

const createPropertySchema = z.object({
  name: zRequiredString,
  addressLine1: zRequiredString,
  city: zRequiredString,
  province: zOptionalString,
  postalCode: zOptionalString,
});

const updatePropertyFinancesSchema = z.object({
  annualPropertyTax: zOptionalCents,
  annualInsurancePremium: zOptionalCents,
  mortgageInterestAnnual: zOptionalCents,
  taxRollNumber: zOptionalString,
  insuranceProvider: zOptionalString,
});

const createUnitSchema = z.object({
  name: zRequiredString,
  rentAmount: zCents,
  rentDueDay: zRentDueDay,
});

const createTenantSchema = z.object({
  firstName: zRequiredString,
  lastName: zRequiredString,
  email: zOptionalEmail,
  phone: zOptionalString,
  moveInDate: zOptionalDate,
  sendWelcomeEmail: zCheckbox,
});

const updateTenantSchema = z.object({
  firstName: zRequiredString,
  lastName: zRequiredString,
  email: zOptionalEmail,
  phone: zOptionalString,
});

const moveOutTenantSchema = z.object({
  moveOutDate: zOptionalDate,
});

const createUtilityBillSchema = z
  .object({
    utilityType: zUtilityType,
    providerName: zOptionalString,
    amount: zCents,
    billingPeriodStart: zDate,
    billingPeriodEnd: zDate,
    dueDate: zOptionalDate,
  })
  .refine((d) => d.billingPeriodEnd >= d.billingPeriodStart, {
    message: "Billing end date must be on or after start date",
    path: ["billingPeriodEnd"],
  });

const importPreviewSchema = z.object({
  utilityType: z.preprocess(
    (v) => (typeof v === "string" && v ? v : "gas"),
    z.enum(UTILITY_TYPES)
  ),
  billMonth: zMonth,
  billYear: zYear,
});

const addBillDatabaseSchema = z.object({
  utilityType: zUtilityType,
  billMonth: zMonth,
  billYear: zYear,
  amount: zCents,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function redirectWithActionError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// ── Property Actions ──────────────────────────────────────────────────────────

export async function createPropertyAction(formData: FormData) {
  const user = await requireUser();

  const parsed = createPropertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/properties/new?error=required");

  const { name, addressLine1, city, province, postalCode } = parsed.data;

  const property = await prisma.property.create({
    data: { userId: user.id, name, addressLine1, city, province, postalCode },
  });

  revalidatePath("/properties");
  redirect(`/properties/${property.id}`);
}

export async function updatePropertyFinancesAction(propertyId: string, formData: FormData) {
  const user = await requireUser();
  await requireProperty(user.id, propertyId);

  const parsed = updatePropertyFinancesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/properties/${propertyId}?error=finances`);

  const { annualPropertyTax, annualInsurancePremium, mortgageInterestAnnual, taxRollNumber, insuranceProvider } =
    parsed.data;

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      annualPropertyTaxCents: annualPropertyTax ?? null,
      annualInsurancePremiumCents: annualInsurancePremium ?? null,
      mortgageInterestAnnualCents: mortgageInterestAnnual ?? null,
      insuranceProvider: insuranceProvider ?? null,
      taxRollNumber: taxRollNumber ?? null,
    },
  });

  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/billing/tax-reports");
  redirect(`/properties/${propertyId}?saved=finances`);
}

export async function deletePropertyAction(propertyId: string, formData: FormData) {
  const user = await requireUser();
  const property = await requireProperty(user.id, propertyId);

  const confirm = String(formData.get("confirm") || "").trim();
  if (confirm !== property.name) {
    redirect(`/properties/${propertyId}?error=delete_confirm`);
  }

  await prisma.property.delete({ where: { id: propertyId } });

  revalidatePath("/properties");
  revalidatePath("/dashboard");
  redirect("/properties?deleted=1");
}

// ── Unit Actions ──────────────────────────────────────────────────────────────

export async function createUnitAction(propertyId: string, formData: FormData) {
  const user = await requireUser();
  await requireProperty(user.id, propertyId);

  const parsed = createUnitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/properties/${propertyId}/units/new?error=required`);

  const { name, rentAmount: rentAmountCents, rentDueDay } = parsed.data;

  const unit = await prisma.unit.create({
    data: { propertyId, name, rentAmountCents, rentDueDay },
  });

  revalidatePath(`/properties/${propertyId}`);
  redirect(`/properties/${propertyId}/units/${unit.id}`);
}

export async function updateUnitAction(unitId: string, formData: FormData) {
  const user = await requireUser();
  const unit = await requireUnit(user.id, unitId);

  const parsed = createUnitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/properties/${unit.propertyId}/units/${unitId}?error=unit`);
  }

  const { name, rentAmount: rentAmountCents, rentDueDay } = parsed.data;

  await prisma.unit.update({
    where: { id: unitId },
    data: { name, rentAmountCents, rentDueDay },
  });

  revalidatePath(`/properties/${unit.propertyId}/units/${unitId}`);
  redirect(`/properties/${unit.propertyId}/units/${unitId}?saved=unit`);
}

export async function deleteUnitAction(unitId: string, formData: FormData) {
  const user = await requireUser();
  const unit = await requireUnit(user.id, unitId);

  const confirm = String(formData.get("confirm") || "").trim();
  if (confirm !== unit.name) {
    redirect(`/properties/${unit.propertyId}/units/${unitId}?error=delete_confirm`);
  }

  await prisma.unit.delete({ where: { id: unitId } });

  revalidatePath(`/properties/${unit.propertyId}`);
  revalidatePath("/properties");
  revalidatePath("/dashboard");
  redirect(`/properties/${unit.propertyId}?deleted=unit`);
}

// ── Tenant Actions ────────────────────────────────────────────────────────────

export async function createTenantAction(unitId: string, formData: FormData) {
  const user = await requireUser();
  const unit = await requireUnit(user.id, unitId);
  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });

  const parsed = createTenantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/properties/${unit.propertyId}/units/${unitId}?error=tenant`);
  }

  const { firstName, lastName, email, phone, moveInDate: moveInDateParsed, sendWelcomeEmail } =
    parsed.data;
  const moveInDate = moveInDateParsed ?? new Date();

  const property = await prisma.property.findUnique({ where: { id: unit.propertyId } });
  if (!property) throw new Error("Property not found");

  const utilityRules = await prisma.utilityRule.findMany({
    where: { unitId },
    orderBy: { utilityType: "asc" },
  });

  let newTenantId = "";

  await prisma.$transaction(async (tx) => {
    const departing = await tx.tenant.findMany({
      where: { unitId, isActive: true },
    });

    if (departing.length > 0) {
      await tx.tenant.updateMany({
        where: { unitId, isActive: true },
        data: { isActive: false, moveOutDate: moveInDate },
      });
      await tx.lease.updateMany({
        where: {
          unitId,
          tenantId: { in: departing.map((t) => t.id) },
          status: "active",
        },
        data: { status: "terminated" },
      });
    }

    const tenant = await tx.tenant.create({
      data: {
        unitId,
        firstName,
        lastName,
        email,
        phone,
        moveInDate,
        isActive: true,
      },
    });
    newTenantId = tenant.id;

    await tx.lease.create({
      data: {
        unitId,
        tenantId: tenant.id,
        leaseStartDate: moveInDate,
        rentAmountCents: unit.rentAmountCents,
        rentDueDay: unit.rentDueDay,
        status: "active",
      },
    });
  });

  const { buildUtilityTerms } = await import("@/lib/lease-wizard");
  const { generateOnboardingPdf } = await import("@/lib/pdf");
  const landlordName = settings?.landlordName || user.name || user.email;
  const propertyAddress = [property.addressLine1, property.city, property.province]
    .filter(Boolean)
    .join(", ");

  const onboardingDoc = await generateOnboardingPdf({
    userId: user.id,
    propertyId: property.id,
    unitId: unit.id,
    tenantId: newTenantId,
    landlordName,
    landlordEmail: user.email,
    propertyName: property.name,
    propertyAddress,
    unitName: unit.name,
    tenantName: `${firstName} ${lastName}`,
    tenantEmail: email,
    tenantPhone: phone,
    moveInDate,
    rentAmountCents: unit.rentAmountCents,
    rentDueDay: unit.rentDueDay,
    paymentInstructions: settings?.paymentInstructions ?? undefined,
    utilityLines: buildUtilityTerms(utilityRules),
  });

  if (sendWelcomeEmail) {
    if (!email) {
      redirect(
        `/properties/${unit.propertyId}/units/${unitId}?saved=newtenant&documentId=${onboardingDoc.id}&error=no_email`
      );
    }

    const { sendEmail } = await import("@/server/emails/send");
    const { buildOnboardingEmailContent } = await import("@/lib/tenant-communications");
    const { formatMoney } = await import("@/lib/money");
    const emailContent = buildOnboardingEmailContent({
      tenantName: firstName,
      propertyName: property.name,
      unitName: unit.name,
      propertyAddress,
      moveInDate: moveInDate.toLocaleDateString("en-CA"),
      rentAmount: formatMoney(unit.rentAmountCents),
      rentDueDay: unit.rentDueDay,
      landlordName,
      landlordEmail: user.email,
    });

    await sendEmail({
      to: email,
      subject: emailContent.subject,
      body: emailContent.text,
      html: emailContent.html,
      attachmentName: onboardingDoc.fileName,
    });

    await prisma.document.update({
      where: { id: onboardingDoc.id },
      data: { sentToTenantAt: new Date() },
    });

    revalidatePath(`/properties/${unit.propertyId}/units/${unitId}`);
    revalidatePath(`/properties/${unit.propertyId}`);
    revalidatePath("/documents");
    redirect(
      `/properties/${unit.propertyId}/units/${unitId}?saved=newtenant&documentId=${onboardingDoc.id}&emailed=1`
    );
  }

  revalidatePath(`/properties/${unit.propertyId}/units/${unitId}`);
  revalidatePath(`/properties/${unit.propertyId}`);
  revalidatePath("/documents");
  redirect(
    `/properties/${unit.propertyId}/units/${unitId}?saved=newtenant&documentId=${onboardingDoc.id}`
  );
}

export async function updateTenantAction(tenantId: string, formData: FormData) {
  const user = await requireUser();
  const tenant = await requireTenant(user.id, tenantId);

  const parsed = updateTenantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/properties/${tenant.unit.propertyId}/units/${tenant.unitId}?error=tenant`);
  }

  const { firstName, lastName, email, phone } = parsed.data;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { firstName, lastName, email, phone },
  });

  revalidatePath(`/properties/${tenant.unit.propertyId}/units/${tenant.unitId}`);
  redirect(`/properties/${tenant.unit.propertyId}/units/${tenant.unitId}?saved=tenant`);
}

export async function moveOutTenantAction(tenantId: string, formData: FormData) {
  const user = await requireUser();
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, isActive: true, unit: { property: { userId: user.id } } },
    include: { unit: true },
  });
  if (!tenant) {
    redirect("/properties?error=Tenant%20not%20found");
  }

  const parsed = moveOutTenantSchema.safeParse(Object.fromEntries(formData));
  const moveOutDate = parsed.success ? (parsed.data.moveOutDate ?? new Date()) : new Date();

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive: false, moveOutDate },
  });

  await prisma.lease.updateMany({
    where: { tenantId, unitId: tenant.unitId, status: "active" },
    data: { status: "terminated" },
  });

  revalidatePath(`/properties/${tenant.unit.propertyId}/units/${tenant.unitId}`);
  revalidatePath(`/properties/${tenant.unit.propertyId}`);
  redirect(`/properties/${tenant.unit.propertyId}/units/${tenant.unitId}?saved=moved`);
}

// ── Utility Rule Actions ──────────────────────────────────────────────────────

export async function saveUtilityRulesAction(unitId: string, formData: FormData) {
  const user = await requireUser();
  const unit = await requireUnit(user.id, unitId);

  for (const type of UTILITY_TYPES) {
    const tenantPays = formData.get(`${type}_tenantPays`) === "on";
    const includedInRent = formData.get(`${type}_includedInRent`) === "on";
    const percentageRaw = zPercentage.parse(formData.get(`${type}_percentage`) ?? "0");
    const percentage = tenantPays && !includedInRent ? percentageRaw : 0;

    await prisma.utilityRule.upsert({
      where: { unitId_utilityType: { unitId, utilityType: type } },
      create: { unitId, utilityType: type, tenantPays, includedInRent, percentage },
      update: { tenantPays, includedInRent, percentage },
    });
  }

  const { recalculatePropertyUtilitySplits } = await import("@/lib/statements");
  await recalculatePropertyUtilitySplits(unit.propertyId);

  revalidatePath(`/properties/${unit.propertyId}/units/${unitId}/utilities`);
  revalidatePath(`/properties/${unit.propertyId}/utility-bills`);
  revalidatePath("/billing/statements");
  redirect(`/properties/${unit.propertyId}/units/${unitId}/utilities?saved=1`);
}

// ── Utility Bill Actions ──────────────────────────────────────────────────────

export async function createUtilityBillAction(propertyId: string, formData: FormData) {
  const user = await requireUser();
  await requireProperty(user.id, propertyId);

  const parsed = createUtilityBillSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid form data";
    redirectWithActionError(`/properties/${propertyId}/utility-bills/new`, firstError);
  }

  const { utilityType, providerName, amount: amountCents, billingPeriodStart, billingPeriodEnd, dueDate } =
    parsed.data;

  if (!isReasonableBillCents(amountCents)) {
    redirect(`/properties/${propertyId}/utility-bills/new?error=amount`);
  }

  const file = formData.get("file") as File | null;
  let documentId: string | undefined;

  if (file && file.size > 0) {
    try {
      const { saveUploadedFile } = await import("@/lib/files");
      const doc = await saveUploadedFile(file, {
        userId: user.id,
        category: "utility_bill",
        propertyId,
      });
      documentId = doc.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "File upload failed";
      redirectWithActionError(`/properties/${propertyId}/utility-bills/new`, msg);
    }
  }

  const { statementMonthFromBillDate } = await import("@/lib/utility-bill-month");
  const billMonthSource = dueDate ?? billingPeriodEnd;
  const { month: billMonth, year: billYear } = statementMonthFromBillDate(billMonthSource);

  const existingBill = await prisma.utilityBill.findFirst({
    where: { propertyId, utilityType, billMonth, billYear },
  });

  const bill = existingBill
    ? await prisma.utilityBill.update({
        where: { id: existingBill.id },
        data: {
          providerName,
          amountCents,
          billingPeriodStart,
          billingPeriodEnd,
          dueDate: dueDate ?? billingPeriodEnd,
          documentId,
          source: "manual",
        },
      })
    : await prisma.utilityBill.create({
        data: {
          propertyId,
          utilityType,
          providerName,
          amountCents,
          billingPeriodStart,
          billingPeriodEnd,
          dueDate: dueDate ?? billingPeriodEnd,
          billMonth,
          billYear,
          documentId,
        },
      });

  const { calculateUtilitySplits } = await import("@/lib/statements");
  await calculateUtilitySplits(bill.id, propertyId);

  revalidatePath(`/properties/${propertyId}/utility-bills`);
  redirect(`/properties/${propertyId}/utility-bills/${bill.id}`);
}

async function createSpreadsheetBill(
  db: DbClient,
  propertyId: string,
  utilityType: SpreadsheetUtilityType,
  row: { month: number; year: number; amountCents: number }
) {
  if (!isReasonableBillCents(row.amountCents)) {
    throw new Error(
      `Invalid bill amount for ${utilityType} ${row.month}/${row.year}. Check the Amount column in your spreadsheet.`
    );
  }
  const { defaultBillingDatesForMonth } = await import("@/lib/utility-bill-month");
  const { billingPeriodStart, billingPeriodEnd, dueDate } = defaultBillingDatesForMonth(
    row.month,
    row.year
  );

  return db.utilityBill.create({
    data: {
      propertyId,
      utilityType,
      amountCents: row.amountCents,
      billingPeriodStart,
      billingPeriodEnd,
      dueDate,
      billMonth: row.month,
      billYear: row.year,
      source: "spreadsheet",
      notes: "Bill database import",
    },
  });
}

async function upsertSpreadsheetBill(
  propertyId: string,
  utilityType: SpreadsheetUtilityType,
  row: { month: number; year: number; amountCents: number }
) {
  const existing = await prisma.utilityBill.findFirst({
    where: { propertyId, utilityType, billMonth: row.month, billYear: row.year },
  });

  if (existing) {
    if (!isReasonableBillCents(row.amountCents)) {
      throw new Error(
        `Invalid bill amount for ${utilityType} ${row.month}/${row.year}. Check the Amount column in your spreadsheet.`
      );
    }
    const { defaultBillingDatesForMonth } = await import("@/lib/utility-bill-month");
    const { billingPeriodStart, billingPeriodEnd, dueDate } = defaultBillingDatesForMonth(
      row.month,
      row.year
    );
    const { calculateUtilitySplits } = await import("@/lib/statements");

    await prisma.utilityBill.update({
      where: { id: existing.id },
      data: { amountCents: row.amountCents, billingPeriodStart, billingPeriodEnd, dueDate, source: "spreadsheet" },
    });
    await calculateUtilitySplits(existing.id, propertyId);
    return existing.id;
  }

  const bill = await createSpreadsheetBill(prisma, propertyId, utilityType, row);
  const { calculateUtilitySplits } = await import("@/lib/statements");
  await calculateUtilitySplits(bill.id, propertyId);
  return bill.id;
}

async function replaceSpreadsheetBills(
  propertyId: string,
  utilityType: SpreadsheetUtilityType,
  rows: { month: number; year: number; amountCents: number }[]
) {
  const bills = await prisma.$transaction(async (tx) => {
    await tx.utilityBill.deleteMany({
      where: { propertyId, utilityType, source: "spreadsheet" },
    });
    const created = [];
    for (const row of rows) {
      created.push(await createSpreadsheetBill(tx, propertyId, utilityType, row));
    }
    return created;
  });

  const { calculateUtilitySplits } = await import("@/lib/statements");
  for (const bill of bills) {
    await calculateUtilitySplits(bill.id, propertyId);
  }
  return bills.map((b) => b.id);
}

export async function previewUtilityBillsImportAction(propertyId: string, formData: FormData) {
  const user = await requireUser();
  await requireProperty(user.id, propertyId);

  const parsed = importPreviewSchema.safeParse(Object.fromEntries(formData));
  const utilityType = parsed.success ? parsed.data.utilityType : "gas";
  const fallbackMonth = parsed.success ? parsed.data.billMonth : undefined;
  const fallbackYear = parsed.success ? parsed.data.billYear : undefined;

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return { error: "Choose an .xlsx file to upload." };
  }
  if (file.size > MAX_XLSX_UPLOAD_BYTES) {
    return { error: "Spreadsheet must be 10 MB or smaller." };
  }

  const buffer = await file.arrayBuffer();
  const { parseBillsFromXlsxBuffer } = await import("@/lib/parse-bills-xlsx");

  try {
    const rows = parseBillsFromXlsxBuffer(buffer, {
      defaultMonth: fallbackMonth,
      defaultYear: fallbackYear,
      utilityType,
    });

    const existingBillCount = await prisma.utilityBill.count({
      where: { propertyId, utilityType, source: "spreadsheet" },
    });

    return { rowCount: rows.length, utilityType, existingBillCount };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not read spreadsheet" };
  }
}

export async function importUtilityBillsXlsxAction(propertyId: string, formData: FormData) {
  const user = await requireUser();
  await requireProperty(user.id, propertyId);

  if (formData.get("confirmed") !== "true") {
    redirect(`/properties/${propertyId}/utility-bills/import?error=confirm_required`);
  }

  const parsed = importPreviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/properties/${propertyId}/utility-bills/import?error=invalid`);
  }

  const { utilityType, billMonth: fallbackMonth, billYear: fallbackYear } = parsed.data;

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    redirect(`/properties/${propertyId}/utility-bills/import?error=no_file`);
  }
  if (file.size > MAX_XLSX_UPLOAD_BYTES) {
    redirect(`/properties/${propertyId}/utility-bills/import?error=file_too_large`);
  }

  const buffer = await file.arrayBuffer();
  const { parseBillsFromXlsxBuffer } = await import("@/lib/parse-bills-xlsx");

  let rows;
  try {
    rows = parseBillsFromXlsxBuffer(buffer, {
      defaultMonth: fallbackMonth,
      defaultYear: fallbackYear,
      utilityType,
    });
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message : "Invalid spreadsheet");
    redirect(`/properties/${propertyId}/utility-bills/import?error=${msg}`);
  }

  const billIds = await replaceSpreadsheetBills(propertyId, utilityType, rows);

  revalidatePath(`/properties/${propertyId}/utility-bills`);
  revalidatePath(`/properties/${propertyId}/utility-bills/import`);
  revalidatePath("/billing/statements");
  redirect(`/properties/${propertyId}/utility-bills/import?imported=${billIds.length}`);
}

export async function addUtilityBillDatabaseAction(propertyId: string, formData: FormData) {
  const user = await requireUser();
  await requireProperty(user.id, propertyId);

  const parsed = addBillDatabaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/properties/${propertyId}/utility-bills/import?error=month_year`);
  }

  const { utilityType, billMonth: month, billYear: year, amount: amountCents } = parsed.data;

  await upsertSpreadsheetBill(propertyId, utilityType, { month, year, amountCents });

  revalidatePath(`/properties/${propertyId}/utility-bills`);
  revalidatePath(`/properties/${propertyId}/utility-bills/import`);
  revalidatePath("/billing/statements");
  redirect(`/properties/${propertyId}/utility-bills/import?added=1`);
}
