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

