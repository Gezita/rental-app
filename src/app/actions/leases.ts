"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseMoneyToCents } from "@/lib/money";
import { generateLeasePdf } from "@/lib/pdf";
import { parseValidDate } from "@/lib/validation";

export async function generateLeaseAction(unitId: string, formData: FormData) {
  const user = await requireUser();
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { userId: user.id } },
    include: {
      property: true,
      utilityRules: true,
      tenants: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
      leases: { where: { status: "active" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!unit) throw new Error("Unit not found");

  const tenant = unit.tenants[0];
  if (!tenant) {
    redirect(
      `/properties/${unit.propertyId}/units/${unitId}/lease/wizard?error=${encodeURIComponent("Add an active tenant before generating a lease.")}`
    );
  }

  const leaseStartStr = String(formData.get("leaseStartDate") || "");
  const leaseEndStr = String(formData.get("leaseEndDate") || "").trim();
  const leaseStartDate =
    parseValidDate(leaseStartStr) ??
    tenant.moveInDate ??
    new Date();
  const leaseEndDate = leaseEndStr ? parseValidDate(leaseEndStr) ?? undefined : undefined;

  const securityDepositRaw = String(formData.get("securityDeposit") || "").trim();
  const securityDepositCents = securityDepositRaw
    ? parseMoneyToCents(securityDepositRaw)
    : undefined;

  const lastMonthRentDeposit = formData.get("lastMonthRentDeposit") === "on";
  const parkingIncluded = formData.get("parkingIncluded") === "on";
  const smokingAllowed = formData.get("smokingAllowed") === "on";
  const petsAllowed = String(formData.get("petsAllowed") || "no") as
    | "yes"
    | "no"
    | "with_permission";
  const additionalTerms = String(formData.get("additionalTerms") || "").trim() || undefined;

  const settings = user.settings;
  const landlordName = settings?.landlordName || user.name || user.email;
  const propertyAddress = [
    unit.property.addressLine1,
    unit.property.addressLine2,
    unit.property.city,
    unit.property.province,
    unit.property.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const doc = await generateLeasePdf({
    userId: user.id,
    propertyId: unit.propertyId,
    unitId: unit.id,
    tenantId: tenant.id,
    landlordName,
    landlordEmail: user.email,
    propertyName: unit.property.name,
    propertyAddress,
    unitName: unit.name,
    tenantName: `${tenant.firstName} ${tenant.lastName}`,
    tenantEmail: tenant.email ?? undefined,
    tenantPhone: tenant.phone ?? undefined,
    leaseStartDate,
    leaseEndDate,
    rentAmountCents: unit.rentAmountCents,
    rentDueDay: unit.rentDueDay,
    securityDepositCents,
    lastMonthRentDeposit,
    parkingIncluded,
    petsAllowed,
    smokingAllowed,
    utilityRules: unit.utilityRules,
    additionalTerms,
  });

  const existingLease = unit.leases[0];
  const leaseData = {
    leaseStartDate,
    leaseEndDate: leaseEndDate ?? null,
    rentAmountCents: unit.rentAmountCents,
    rentDueDay: unit.rentDueDay,
    documentId: doc.id,
    securityDepositCents: securityDepositCents ?? null,
    lastMonthRentDeposit,
    additionalTerms,
    status: "active" as const,
  };

  if (existingLease) {
    await prisma.lease.update({
      where: { id: existingLease.id },
      data: leaseData,
    });
  } else {
    await prisma.lease.create({
      data: {
        unitId: unit.id,
        tenantId: tenant.id,
        ...leaseData,
      },
    });
  }

  revalidatePath(`/properties/${unit.propertyId}/units/${unitId}`);
  revalidatePath(`/properties/${unit.propertyId}/units/${unitId}/lease/wizard`);
  revalidatePath("/documents");
  redirect(
    `/properties/${unit.propertyId}/units/${unitId}?saved=lease&documentId=${doc.id}`
  );
}
