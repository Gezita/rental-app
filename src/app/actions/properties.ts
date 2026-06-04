"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseMoneyToCents } from "@/lib/money";
import { requireProperty, requireUnit, requireTenant } from "@/lib/ownership";

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
  const rentDueDay = parseInt(String(formData.get("rentDueDay") || "1"), 10);

  if (!name) redirect(`/properties/${propertyId}/units/new?error=required`);

  const unit = await prisma.unit.create({
    data: {
      propertyId,
      name,
      rentAmountCents: parseMoneyToCents(rentAmount),
      rentDueDay: Math.min(31, Math.max(1, rentDueDay)),
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
  const rentDueDay = parseInt(String(formData.get("rentDueDay") || "1"), 10);

  if (!name) {
    redirect(`/properties/${unit.propertyId}/units/${unitId}?error=unit`);
  }

  await prisma.unit.update({
    where: { id: unitId },
    data: {
      name,
      rentAmountCents: parseMoneyToCents(rentAmount),
      rentDueDay: Math.min(31, Math.max(1, rentDueDay)),
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
  const moveInDate = moveInDateStr ? new Date(moveInDateStr) : new Date();

  const departing = await prisma.tenant.findMany({
    where: { unitId, isActive: true },
  });

  if (departing.length > 0) {
    await prisma.tenant.updateMany({
      where: { unitId, isActive: true },
      data: { isActive: false, moveOutDate: moveInDate },
    });
    await prisma.lease.updateMany({
      where: {
        unitId,
        tenantId: { in: departing.map((t) => t.id) },
        status: "active",
      },
      data: { status: "terminated" },
    });
  }

  await prisma.tenant.create({
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
  if (!tenant) throw new Error("Tenant not found");

  const moveOutDateStr = String(formData.get("moveOutDate") || "").trim();
  const moveOutDate = moveOutDateStr ? new Date(moveOutDateStr) : new Date();

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
    const percentage = parseFloat(String(formData.get(`${type}_percentage`) || "0"));

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

  revalidatePath(`/properties/${unit.propertyId}/units/${unitId}/utilities`);
  redirect(`/properties/${unit.propertyId}/units/${unitId}/utilities?saved=1`);
}

export async function createUtilityBillAction(propertyId: string, formData: FormData) {
  const user = await requireUser();
  await requireProperty(user.id, propertyId);

  const utilityType = String(formData.get("utilityType") || "other");
  const providerName = String(formData.get("providerName") || "").trim() || undefined;
  const amountCents = parseMoneyToCents(String(formData.get("amount") || "0"));
  const billingPeriodStart = new Date(String(formData.get("billingPeriodStart")));
  const billingPeriodEnd = new Date(String(formData.get("billingPeriodEnd")));
  const dueDateStr = String(formData.get("dueDate") || "");
  const dueDate = dueDateStr ? new Date(dueDateStr) : undefined;
  const file = formData.get("file") as File | null;

  let documentId: string | undefined;
  if (file && file.size > 0) {
    const { saveUploadedFile } = await import("@/lib/files");
    const doc = await saveUploadedFile(file, {
      userId: user.id,
      category: "utility_bill",
      propertyId,
    });
    documentId = doc.id;
  }

  const bill = await prisma.utilityBill.create({
    data: {
      propertyId,
      utilityType: utilityType as "gas" | "water" | "electricity" | "internet" | "other",
      providerName,
      amountCents,
      billingPeriodStart,
      billingPeriodEnd,
      dueDate,
      documentId,
    },
  });

  const { calculateUtilitySplits } = await import("@/lib/statements");
  await calculateUtilitySplits(bill.id, propertyId);

  revalidatePath(`/properties/${propertyId}/utility-bills`);
  redirect(`/properties/${propertyId}/utility-bills/${bill.id}`);
}
