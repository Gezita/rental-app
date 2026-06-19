import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

async function main() {
  const email = "demo@landlord.app";
  const password = await bcrypt.hash("demo1234", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password,
      name: "Demo Landlord",
      settings: {
        create: {
          landlordName: "Demo Landlord",
          paymentInstructions:
            "Send e-transfer to demo@landlord.app. Include unit name in the memo.",
        },
      },
    },
  });

  console.log("Seeded demo user:", email, "/ password: demo1234");
  console.log("User ID:", user.id);

  // Ensure every property has an OWNER membership for its creator. Access is
  // decided by PropertyMember (not Property.userId), so without this any seeded
  // or imported property would be invisible to its owner.
  const properties = await prisma.property.findMany({ select: { id: true, userId: true } });
  for (const property of properties) {
    await prisma.propertyMember.upsert({
      where: { propertyId_userId: { propertyId: property.id, userId: property.userId } },
      create: { propertyId: property.id, userId: property.userId, role: "OWNER" },
      update: {},
    });
  }
  console.log(`Ensured OWNER membership for ${properties.length} propert${properties.length === 1 ? "y" : "ies"}.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
