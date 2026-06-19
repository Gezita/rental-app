"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateLeasePdf } from "@/lib/pdf";
import {
  zCheckbox,
  zOptionalCents,
  zOptionalDate,
  zOptionalString,
} from "@/lib/validation";

// ── Shared lease fields ───────────────────────────────────────────────────────

const leaseBaseSchema = z.object({
  leaseStartDate: zOptionalDate,
  leaseEndDate: zOptionalDate,
  lastMonthRentDeposit: zCheckbox,
  parkingIncluded: zCheckbox,
  smokingAllowed: zCheckbox,
  petsAllowed: z.preprocess(
    (v) => (typeof v === "string" && v ? v : "no"),
    z.enum(["yes", "no", "with_permission"])
  ),
  additionalTerms: zOptionalString,
});

const generateLeaseSchema = leaseBaseSchema.extend({
  securityDeposit: zOptionalCents,
});

const generateStandardLeaseSchema = leaseBaseSchema.extend({
  rentPaymentMethod: zOptionalString,
  partialRent: zOptionalCents,
  partialRentStartDate: zOptionalDate,
  partialRentEndDate: zOptionalDate,
  rentDeposit: zOptionalCents,
  keyDeposit: zOptionalCents,
});

// ── Actions ───────────────────────────────────────────────────────────────────

export async function generateStandardLease2229eAction(unitId: string, formData: FormData) {
  const user = await requireUser();
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { members: { some: { userId: user.id } } } },
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
      `/properties/${unit.propertyId}/units/${unitId}/lease/standard-lease?error=${encodeURIComponent("Add an active tenant before generating a lease.")}`
    );
  }

  const parsed = generateStandardLeaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      `/properties/${unit.propertyId}/units/${unitId}/lease/standard-lease?error=${encodeURIComponent("Invalid form data")}`
    );
  }

  const {
    leaseStartDate,
    leaseEndDate,
    rentPaymentMethod,
    partialRent: partialRentCents,
    partialRentStartDate,
    partialRentEndDate,
    rentDeposit: rentDepositCents,
    keyDeposit: keyDepositCents,
    lastMonthRentDeposit,
    parkingIncluded,
    smokingAllowed,
    petsAllowed,
    additionalTerms,
  } = parsed.data;

  const servicesIncluded = formData.getAll("servicesIncluded").map(String).filter(Boolean);
  const utilitiesTenantPays = formData.getAll("utilitiesTenantPays").map(String).filter(Boolean);
  const utilitiesLandlordPays = formData.getAll("utilitiesLandlordPays").map(String).filter(Boolean);

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

  const { generateStandardLease2229ePdf } = await import("@/lib/pdf");
  const doc = await generateStandardLease2229ePdf({
    userId: user.id,
    propertyId: unit.propertyId,
    unitId: unit.id,
    tenantId: tenant.id,
    landlordName,
    landlordEmail: user.email,
    tenantName: `${tenant.firstName} ${tenant.lastName}`,
    tenantEmail: tenant.email ?? undefined,
    tenantPhone: tenant.phone ?? undefined,
    emergencyContactName: tenant.emergencyContactName ?? undefined,
    emergencyContactPhone: tenant.emergencyContactPhone ?? undefined,
    propertyName: unit.property.name,
    propertyAddress,
    unitName: unit.name,
    leaseStartDate: leaseStartDate ?? tenant.moveInDate ?? new Date(),
    leaseEndDate,
    rentAmountCents: unit.rentAmountCents,
    rentDueDay: unit.rentDueDay,
    rentPaymentMethod: rentPaymentMethod ?? settings?.paymentInstructions ?? undefined,
    partialRentCents,
    partialRentStartDate,
    partialRentEndDate,
    servicesIncluded,
    utilitiesTenantPays,
    utilitiesLandlordPays,
    utilityRules: unit.utilityRules,
    rentDepositCents: rentDepositCents ?? (lastMonthRentDeposit ? unit.rentAmountCents : undefined),
    keyDepositCents,
    smokingAllowed,
    petsAllowed,
    parkingIncluded,
    additionalTerms,
  });

  const existingLease = unit.leases[0];
  const leaseData = {
    leaseStartDate: leaseStartDate ?? tenant.moveInDate ?? new Date(),
    leaseEndDate: leaseEndDate ?? null,
    rentAmountCents: unit.rentAmountCents,
    rentDueDay: unit.rentDueDay,
    documentId: doc.id,
    securityDepositCents: rentDepositCents ?? null,
    lastMonthRentDeposit,
    additionalTerms,
    status: "active" as const,
  };

  if (existingLease) {
    await prisma.lease.update({ where: { id: existingLease.id }, data: leaseData });
  } else {
    await prisma.lease.create({ data: { unitId: unit.id, tenantId: tenant.id, ...leaseData } });
  }

  revalidatePath(`/properties/${unit.propertyId}/units/${unitId}`);
  revalidatePath(`/properties/${unit.propertyId}/units/${unitId}/lease/standard-lease`);
  revalidatePath("/documents");
  redirect(
    `/properties/${unit.propertyId}/units/${unitId}/lease/complete?documentId=${doc.id}`
  );
}

export async function generateLeaseAction(unitId: string, formData: FormData) {
  const user = await requireUser();
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { members: { some: { userId: user.id } } } },
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

  const parsed = generateLeaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      `/properties/${unit.propertyId}/units/${unitId}/lease/wizard?error=${encodeURIComponent("Invalid form data")}`
    );
  }

  const {
    leaseStartDate,
    leaseEndDate,
    securityDeposit: securityDepositCents,
    lastMonthRentDeposit,
    parkingIncluded,
    smokingAllowed,
    petsAllowed,
    additionalTerms,
  } = parsed.data;

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
    leaseStartDate: leaseStartDate ?? tenant.moveInDate ?? new Date(),
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
    leaseStartDate: leaseStartDate ?? tenant.moveInDate ?? new Date(),
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
    await prisma.lease.update({ where: { id: existingLease.id }, data: leaseData });
  } else {
    await prisma.lease.create({ data: { unitId: unit.id, tenantId: tenant.id, ...leaseData } });
  }

  revalidatePath(`/properties/${unit.propertyId}/units/${unitId}`);
  revalidatePath(`/properties/${unit.propertyId}/units/${unitId}/lease/wizard`);
  revalidatePath("/documents");
  redirect(
    `/properties/${unit.propertyId}/units/${unitId}/lease/complete?documentId=${doc.id}`
  );
}
