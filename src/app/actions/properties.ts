"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isReasonableBillCents, parseMoneyToCents } from "@/lib/money";
import { requireProperty, requireUnit, requireTenant } from "@/lib/ownership";
import {
  MAX_XLSX_UPLOAD_BYTES,
  parsePercentage,
  parseRentDueDay,
  parseUtilityType,
  parseValidDate,
} from "@/lib/validation";

type SpreadsheetUtilityType = "gas" | "water" | "electricity" | "internet" | "other";
type DbClient = Prisma.TransactionClient | typeof prisma;

function redirectWithActionError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createPropertyAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const addressLine1 = String(formData.get("addressLine1") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const province = String(formData.get("province") || "").trim() || undefined;
  const postalCode = String(formData.get("postalCode") || "").trim() || undefined;

  if (!name || !addressLine1 || !city) redirect("/properties/new?error=required");

  const property = await prisma.property.create({
    data: {
      userId: user.id,
      name,
      addressLine1,
      city,
      province,
      postalCode,
    },
  });

  revalidatePath("/properties");
  redirect(`/properties/${property.id}`);
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

export async function createUnitAction(propertyId: string, formData: FormData) {
  const user = await requireUser();
  await requireProperty(user.id, propertyId);

  const name = String(formData.get("name") || "").trim();
  const rentAmount = String(formData.get("rentAmount") || "0");
  const rentDueDay = parseRentDueDay(String(formData.get("rentDueDay") || "1"));
  const rentAmountCents = parseMoneyToCents(rentAmount);

  if (!name) redirect(`/properties/${propertyId}/units/new?error=required`);
  if (rentAmountCents < 0) redirect(`/properties/${propertyId}/units/new?error=rent`);

  const unit = await prisma.unit.create({
    data: {
      propertyId,
      name,
      rentAmountCents,
      rentDueDay,
    },
  });

  revalidatePath(`/properties/${propertyId}`);
  redirect(`/properties/${propertyId}/units/${unit.id}`);
}

export async function updateUnitAction(unitId: string, formData: FormData) {
  const user = await requireUser();
  const unit = await requireUnit(user.id, unitId);

  const name = String(formData.get("name") || "").trim();
  const rentAmount = String(formData.get("rentAmount") || "0");
  const rentDueDay = parseRentDueDay(String(formData.get("rentDueDay") || "1"));
  const rentAmountCents = parseMoneyToCents(rentAmount);

  if (!name) {
    redirect(`/properties/${unit.propertyId}/units/${unitId}?error=unit`);
  }
  if (rentAmountCents < 0) {
    redirect(`/properties/${unit.propertyId}/units/${unitId}?error=rent`);
  }

  await prisma.unit.update({
    where: { id: unitId },
    data: {
      name,
      rentAmountCents,
      rentDueDay,
    },
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

export async function createTenantAction(unitId: string, formData: FormData) {
  const user = await requireUser();
  const unit = await requireUnit(user.id, unitId);

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim() || undefined;
  const phone = String(formData.get("phone") || "").trim() || undefined;

  if (!firstName || !lastName) {
    redirect(`/properties/${unit.propertyId}/units/${unitId}?error=tenant`);
  }

  const moveInDateStr = String(formData.get("moveInDate") || "").trim();
  const moveInDate = moveInDateStr
    ? parseValidDate(moveInDateStr) ?? redirectWithActionError(
        `/properties/${unit.propertyId}/units/${unitId}`,
        "Invalid move-in date"
      )
    : new Date();

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

  revalidatePath(`/properties/${unit.propertyId}/units/${unitId}`);
  revalidatePath(`/properties/${unit.propertyId}`);
  redirect(`/properties/${unit.propertyId}/units/${unitId}?saved=newtenant`);
}

export async function updateTenantAction(tenantId: string, formData: FormData) {
  const user = await requireUser();
  const tenant = await requireTenant(user.id, tenantId);

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim() || undefined;
  const phone = String(formData.get("phone") || "").trim() || undefined;

  if (!firstName || !lastName) {
    redirect(`/properties/${tenant.unit.propertyId}/units/${tenant.unitId}?error=tenant`);
  }

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

  const moveOutDateStr = String(formData.get("moveOutDate") || "").trim();
  const moveOutDate = moveOutDateStr
    ? parseValidDate(moveOutDateStr) ?? redirectWithActionError(
        `/properties/${tenant.unit.propertyId}/units/${tenant.unitId}`,
        "Invalid move-out date"
      )
    : new Date();

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

export async function saveUtilityRulesAction(unitId: string, formData: FormData) {
  const user = await requireUser();
  const unit = await requireUnit(user.id, unitId);

  const types = ["gas", "water", "electricity", "internet", "other"] as const;

  for (const type of types) {
    const tenantPays = formData.get(`${type}_tenantPays`) === "on";
    const includedInRent = formData.get(`${type}_includedInRent`) === "on";
    const percentage = parsePercentage(String(formData.get(`${type}_percentage`) || "0"));

    await prisma.utilityRule.upsert({
      where: { unitId_utilityType: { unitId, utilityType: type } },
      create: {
        unitId,
        utilityType: type,
        tenantPays,
        includedInRent,
        percentage: tenantPays && !includedInRent ? percentage : 0,
      },
      update: {
        tenantPays,
        includedInRent,
        percentage: tenantPays && !includedInRent ? percentage : 0,
      },
    });
  }

  const { recalculatePropertyUtilitySplits } = await import("@/lib/statements");
  await recalculatePropertyUtilitySplits(unit.propertyId);

  revalidatePath(`/properties/${unit.propertyId}/units/${unitId}/utilities`);
  revalidatePath(`/properties/${unit.propertyId}/utility-bills`);
  revalidatePath("/statements");
  redirect(`/properties/${unit.propertyId}/units/${unitId}/utilities?saved=1`);
}

export async function createUtilityBillAction(propertyId: string, formData: FormData) {
  const user = await requireUser();
  await requireProperty(user.id, propertyId);

  const utilityType =
    parseUtilityType(String(formData.get("utilityType") || "other")) ??
    redirectWithActionError(`/properties/${propertyId}/utility-bills/new`, "Invalid utility type");
  const providerName = String(formData.get("providerName") || "").trim() || undefined;
  const amountCents = parseMoneyToCents(String(formData.get("amount") || "0"));
  if (!isReasonableBillCents(amountCents)) {
    redirect(`/properties/${propertyId}/utility-bills/new?error=amount`);
  }
  const billingPeriodStart =
    parseValidDate(String(formData.get("billingPeriodStart") || "")) ??
    redirectWithActionError(`/properties/${propertyId}/utility-bills/new`, "Invalid billing start date");
  const billingPeriodEnd =
    parseValidDate(String(formData.get("billingPeriodEnd") || "")) ??
    redirectWithActionError(`/properties/${propertyId}/utility-bills/new`, "Invalid billing end date");
  const dueDateStr = String(formData.get("dueDate") || "").trim();
  const dueDate = dueDateStr ? parseValidDate(dueDateStr) ?? undefined : undefined;
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
    where: {
      propertyId,
      utilityType,
      billMonth: row.month,
      billYear: row.year,
    },
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
      data: {
        amountCents: row.amountCents,
        billingPeriodStart,
        billingPeriodEnd,
        dueDate,
        source: "spreadsheet",
      },
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

  const utilityType =
    parseUtilityType(String(formData.get("utilityType") || "gas")) ?? "gas";
  const file = formData.get("file");
  const fallbackMonth = parseInt(String(formData.get("billMonth") || ""), 10);
  const fallbackYear = parseInt(String(formData.get("billYear") || ""), 10);

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
      defaultMonth: fallbackMonth >= 1 && fallbackMonth <= 12 ? fallbackMonth : undefined,
      defaultYear: fallbackYear >= 2000 ? fallbackYear : undefined,
      utilityType,
    });

    const existingBillCount = await prisma.utilityBill.count({
      where: { propertyId, utilityType, source: "spreadsheet" },
    });

    return {
      rowCount: rows.length,
      utilityType,
      existingBillCount,
    };
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

  const utilityType =
    parseUtilityType(String(formData.get("utilityType") || "gas")) ??
    redirectWithActionError(
      `/properties/${propertyId}/utility-bills/import`,
      "Invalid utility type"
    );
  const file = formData.get("file");
  const fallbackMonth = parseInt(String(formData.get("billMonth") || ""), 10);
  const fallbackYear = parseInt(String(formData.get("billYear") || ""), 10);

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
      defaultMonth: fallbackMonth >= 1 && fallbackMonth <= 12 ? fallbackMonth : undefined,
      defaultYear: fallbackYear >= 2000 ? fallbackYear : undefined,
      utilityType,
    });
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message : "Invalid spreadsheet");
    redirect(`/properties/${propertyId}/utility-bills/import?error=${msg}`);
  }

  const billIds = await replaceSpreadsheetBills(propertyId, utilityType, rows);

  revalidatePath(`/properties/${propertyId}/utility-bills`);
  revalidatePath(`/properties/${propertyId}/utility-bills/import`);
  revalidatePath("/statements");
  redirect(`/properties/${propertyId}/utility-bills/import?imported=${billIds.length}`);
}

export async function addUtilityBillDatabaseAction(propertyId: string, formData: FormData) {
  const user = await requireUser();
  await requireProperty(user.id, propertyId);

  const utilityType =
    parseUtilityType(String(formData.get("utilityType") || "gas")) ??
    redirectWithActionError(
      `/properties/${propertyId}/utility-bills/import`,
      "Invalid utility type"
    );
  const month = parseInt(String(formData.get("billMonth") || ""), 10);
  const year = parseInt(String(formData.get("billYear") || ""), 10);
  const amountCents = parseMoneyToCents(String(formData.get("amount") || ""));

  if (!month || month < 1 || month > 12 || !year) {
    redirect(`/properties/${propertyId}/utility-bills/import?error=month_year`);
  }

  await upsertSpreadsheetBill(propertyId, utilityType, { month, year, amountCents });

  revalidatePath(`/properties/${propertyId}/utility-bills`);
  revalidatePath(`/properties/${propertyId}/utility-bills/import`);
  revalidatePath("/statements");
  redirect(`/properties/${propertyId}/utility-bills/import?added=1`);
}
