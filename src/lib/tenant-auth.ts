import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createTenantSessionToken,
  parseTenantSessionToken,
  TENANT_SESSION_COOKIE,
} from "@/lib/tenant-session-token";

export type TenantSessionContext = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  autoPayEnabled: boolean;
  stripeCustomerId: string | null;
  stripePaymentMethodId: string | null;
  unit: {
    id: string;
    name: string;
    property: {
      id: string;
      name: string;
      addressLine1: string;
      city: string;
      user: {
        name: string | null;
        email: string;
        settings: {
          landlordName: string | null;
          paymentInstructions: string | null;
          stripePaymentsEnabled: boolean;
        } | null;
      };
    };
  };
};

export const getSessionTenantId = cache(async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(TENANT_SESSION_COOKIE)?.value;
  const parsed = await parseTenantSessionToken(token);
  if (!parsed) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: parsed.userId },
    select: { id: true, sessionNonce: true, isActive: true },
  });

  if (!tenant || !tenant.isActive || tenant.sessionNonce !== parsed.nonce) return null;
  return tenant.id;
});

export const requireTenant = cache(async (): Promise<TenantSessionContext> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(TENANT_SESSION_COOKIE)?.value;
  const parsed = await parseTenantSessionToken(token);
  if (!parsed) redirect("/tenant/sign-in");

  const tenant = await prisma.tenant.findUnique({
    where: { id: parsed.userId },
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
  });

  if (!tenant || !tenant.isActive || tenant.sessionNonce !== parsed.nonce) {
    redirect("/tenant/sign-in");
  }

  return tenant;
});

export async function setTenantSession(tenantId: string) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { sessionNonce: nonce },
  });
  const cookieStore = await cookies();
  cookieStore.set(
    TENANT_SESSION_COOKIE,
    await createTenantSessionToken(tenantId, nonce),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    }
  );
}

export async function clearTenantSession() {
  const cookieStore = await cookies();
  cookieStore.delete(TENANT_SESSION_COOKIE);
}

export function getTenantDisplayName(tenant: { firstName: string; lastName: string }) {
  return `${tenant.firstName} ${tenant.lastName}`.trim();
}

export function getTenantLandlordName(tenant: {
  unit: {
    property: {
      user: {
        name: string | null;
        settings: { landlordName: string | null } | null;
      };
    };
  };
}) {
  return (
    tenant.unit.property.user.settings?.landlordName ||
    tenant.unit.property.user.name ||
    "Your landlord"
  );
}
