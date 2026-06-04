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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
