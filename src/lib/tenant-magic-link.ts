import { prisma } from "@/lib/db";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashMagicLinkToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return toHex(digest);
}

function createRawMagicLinkToken(): string {
  return `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function createTenantMagicLink(tenantId: string) {
  const rawToken = createRawMagicLinkToken();
  const tokenHash = await hashMagicLinkToken(rawToken);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await prisma.tenantMagicLink.create({
    data: {
      tenantId,
      tokenHash,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
}

export async function consumeTenantMagicLink(rawToken: string) {
  const tokenHash = await hashMagicLinkToken(rawToken);
  const link = await prisma.tenantMagicLink.findUnique({
    where: { tokenHash },
    include: {
      tenant: {
        include: {
          unit: { include: { property: true } },
        },
      },
    },
  });

  if (!link || link.usedAt || link.expiresAt < new Date()) {
    return null;
  }

  if (!link.tenant.isActive || !link.tenant.email) {
    return null;
  }

  await prisma.tenantMagicLink.update({
    where: { id: link.id },
    data: { usedAt: new Date() },
  });

  return link.tenant;
}

export async function findActiveTenantByEmail(email: string) {
  return prisma.tenant.findFirst({
    where: {
      email: email.toLowerCase(),
      isActive: true,
    },
    include: {
      unit: {
        include: {
          property: {
            include: {
              user: { include: { settings: true } },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}
