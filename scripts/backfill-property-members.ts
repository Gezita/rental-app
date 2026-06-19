/**
 * Backfill one OWNER PropertyMember per existing Property.
 *
 * Run once after deploying the shared-properties schema so that every existing
 * landlord keeps access to the properties they created. Idempotent: skips any
 * property that already has an OWNER membership for its creator.
 *
 *   npx tsx scripts/backfill-property-members.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const properties = await prisma.property.findMany({
    select: { id: true, userId: true },
  });

  let created = 0;
  let skipped = 0;

  for (const property of properties) {
    const result = await prisma.propertyMember.upsert({
      where: {
        propertyId_userId: { propertyId: property.id, userId: property.userId },
      },
      create: {
        propertyId: property.id,
        userId: property.userId,
        role: "OWNER",
      },
      update: {}, // leave existing membership untouched
    });
    if (result.role === "OWNER") created += 1;
    else skipped += 1;
  }

  const memberCount = await prisma.propertyMember.count();
  console.log(
    `Properties: ${properties.length} | OWNER memberships ensured: ${created} | pre-existing/other: ${skipped} | total PropertyMember rows: ${memberCount}`
  );

  if (memberCount < properties.length) {
    throw new Error(
      `Parity check failed: ${memberCount} memberships < ${properties.length} properties`
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
