import { prisma } from "@/lib/db";

export async function requireProperty(userId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId },
  });
  if (!property) throw new Error("Property not found");
  return property;
}

export async function requireUnit(userId: string, unitId: string) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { userId } },
    include: { property: true },
  });
  if (!unit) throw new Error("Unit not found");
  return unit;
}

export async function requireTenant(userId: string, tenantId: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, unit: { property: { userId } } },
    include: { unit: { include: { property: true } } },
  });
  if (!tenant) throw new Error("Tenant not found");
  return tenant;
}

export async function requireStatement(userId: string, statementId: string) {
  const statement = await prisma.statement.findFirst({
    where: { id: statementId, unit: { property: { userId } } },
  });
  if (!statement) throw new Error("Statement not found");
  return statement;
}

/**
 * Validates that every association attached to an uploaded document belongs to
 * the current user and that the property → unit → tenant chain is internally
 * consistent. Any of the IDs may be omitted; only the provided ones are checked.
 * Throws if an ID is missing, not owned, or inconsistent with the others.
 *
 * Call this before `saveUploadedFile()` whenever the association IDs come from
 * untrusted form data, to prevent attaching documents to another landlord's
 * property, unit, or tenant.
 */
export async function assertDocumentAssociations(
  userId: string,
  ids: { propertyId?: string; unitId?: string; tenantId?: string }
) {
  const { propertyId, unitId, tenantId } = ids;

  if (propertyId) {
    await requireProperty(userId, propertyId);
  }

  if (unitId) {
    const unit = await requireUnit(userId, unitId);
    if (propertyId && unit.propertyId !== propertyId) {
      throw new Error("Unit does not belong to the given property");
    }
  }

  if (tenantId) {
    const tenant = await requireTenant(userId, tenantId);
    if (unitId && tenant.unitId !== unitId) {
      throw new Error("Tenant does not belong to the given unit");
    }
    if (propertyId && tenant.unit.propertyId !== propertyId) {
      throw new Error("Tenant does not belong to the given property");
    }
  }
}

