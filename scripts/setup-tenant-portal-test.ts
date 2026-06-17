import { prisma } from "../src/lib/db";
import { createTenantMagicLink } from "../src/lib/tenant-magic-link";
import { getAppUrl } from "../src/lib/app-url";

const TEST_EMAIL = "tenant.test@example.com";

async function main() {
  const tenants = await prisma.tenant.findMany({
    include: { unit: { include: { property: true } } },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  if (tenants.length === 0) {
    console.error("No tenants in database. Run: npm run db:seed or add a tenant in the app.");
    process.exit(1);
  }

  const target = tenants.find((t) => t.isActive) ?? tenants[0];
  await prisma.tenant.update({
    where: { id: target.id },
    data: { email: TEST_EMAIL, isActive: true },
  });

  const { rawToken } = await createTenantMagicLink(target.id);
  const magicLinkUrl = `${getAppUrl()}/api/tenant/auth/verify?token=${rawToken}`;

  console.log("Tenant portal test setup");
  console.log("------------------------");
  console.log(`Tenant: ${target.firstName} ${target.lastName}`);
  console.log(`Unit: ${target.unit.property.name} — ${target.unit.name}`);
  console.log(`Email: ${TEST_EMAIL}`);
  console.log(`Sign-in page: ${getAppUrl()}/tenant/sign-in`);
  console.log(`Magic link (15 min): ${magicLinkUrl}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
