import type { PropertyRole } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Access to a property is decided entirely by PropertyMember rows — never by
 * `Property.userId`. A user can reach a property if they have a membership for
 * it; what they can *do* is gated by `minRole`:
 *   read pages          → "VIEWER" (default)
 *   mutating actions     → "MANAGER"
 *   destructive actions  → "OWNER"
 */
export const ROLE_RANK: Record<PropertyRole, number> = {
  VIEWER: 0,
  MANAGER: 1,
  OWNER: 2,
};

/** Filter that scopes a property query to properties the user is a member of. */
export const propertyMemberFilter = (userId: string) => ({
  members: { some: { userId } },
});

function assertRole(role: PropertyRole | undefined, minRole: PropertyRole) {
  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new Error("Insufficient permission");
  }
}

/** Returns the user's role on a property, or null if they have no access. */
export async function getPropertyRole(
  userId: string,
  propertyId: string
): Promise<PropertyRole | null> {
  const membership = await prisma.propertyMember.findUnique({
    where: { propertyId_userId: { propertyId, userId } },
    select: { role: true },
  });
  return membership?.role ?? null;
}

export async function requireProperty(
  userId: string,
  propertyId: string,
  minRole: PropertyRole = "VIEWER"
) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ...propertyMemberFilter(userId) },
    include: { members: { where: { userId }, select: { role: true } } },
  });
  if (!property) throw new Error("Property not found");
  assertRole(property.members[0]?.role, minRole);
  return property;
}

export async function requireUnit(
  userId: string,
  unitId: string,
  minRole: PropertyRole = "VIEWER"
) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: propertyMemberFilter(userId) },
    include: {
      property: { include: { members: { where: { userId }, select: { role: true } } } },
    },
  });
  if (!unit) throw new Error("Unit not found");
  assertRole(unit.property.members[0]?.role, minRole);
  return unit;
}

export async function requireTenant(
  userId: string,
  tenantId: string,
  minRole: PropertyRole = "VIEWER"
) {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, unit: { property: propertyMemberFilter(userId) } },
    include: {
      unit: {
        include: {
          property: { include: { members: { where: { userId }, select: { role: true } } } },
        },
      },
    },
  });
  if (!tenant) throw new Error("Tenant not found");
  assertRole(tenant.unit.property.members[0]?.role, minRole);
  return tenant;
}

export async function requireStatement(
  userId: string,
  statementId: string,
  minRole: PropertyRole = "VIEWER"
) {
  const statement = await prisma.statement.findFirst({
    where: { id: statementId, unit: { property: propertyMemberFilter(userId) } },
    include: {
      unit: {
        select: {
          property: { select: { members: { where: { userId }, select: { role: true } } } },
        },
      },
    },
  });
  if (!statement) throw new Error("Statement not found");
  assertRole(statement.unit.property.members[0]?.role, minRole);
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

