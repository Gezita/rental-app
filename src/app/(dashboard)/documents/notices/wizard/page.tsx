import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateLtbNoticeAction } from "@/app/actions/communications";
import { LTB_FORMS } from "@/lib/ltb-forms";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { FlashAlert } from "@/components/flash-alert";
import {
  LtbNoticeWizardForm,
  type LtbWizardProperty,
  type LtbWizardTenant,
} from "@/components/notices/ltb-notice-wizard-form";
import { Alert, ButtonLink } from "@/components/ui";

export default async function LtbNoticeWizardPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    formCode?: string;
    propertyId?: string;
    unitId?: string;
    tenantId?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [properties, tenants, unpaidByTenant] = await Promise.all([
    prisma.property.findMany({
      where: { members: { some: { userId: user.id } } },
      include: {
        units: {
          select: { id: true, name: true, rentAmountCents: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.tenant.findMany({
      where: { isActive: true, unit: { property: { members: { some: { userId: user.id } } } } },
      include: {
        unit: {
          include: {
            property: true,
            leases: {
              where: { status: "active" },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { lastName: "asc" },
    }),
    prisma.statement.findMany({
      where: {
        status: { in: ["sent", "overdue", "partial"] },
        unit: { property: { members: { some: { userId: user.id } } } },
      },
      select: { tenantId: true, totalDueCents: true, paidAmountCents: true },
    }),
  ]);

  const unpaidMap = new Map<string, number>();
  for (const statement of unpaidByTenant) {
    const balance = statement.totalDueCents - statement.paidAmountCents;
    if (balance <= 0) continue;
    unpaidMap.set(
      statement.tenantId,
      (unpaidMap.get(statement.tenantId) ?? 0) + balance
    );
  }

  const wizardProperties: LtbWizardProperty[] = properties.map((property) => ({
    id: property.id,
    name: property.name,
    addressLine1: property.addressLine1,
    city: property.city,
    units: property.units,
  }));

  const wizardTenants: LtbWizardTenant[] = tenants.map((tenant) => ({
    id: tenant.id,
    firstName: tenant.firstName,
    lastName: tenant.lastName,
    email: tenant.email,
    unitId: tenant.unitId,
    propertyId: tenant.unit.propertyId,
    propertyName: tenant.unit.property.name,
    unitName: tenant.unit.name,
    rentAmountCents: tenant.unit.rentAmountCents,
    leaseEndDate:
      tenant.unit.leases[0]?.leaseEndDate?.toISOString().slice(0, 10) ?? null,
    unpaidRentCents: unpaidMap.get(tenant.id) ?? 0,
  }));

  const errorMessage =
    params.error === "required"
      ? "Please complete all required fields."
      : params.error === "invalid_form"
        ? "Please select a valid LTB form."
        : params.error === "tenant"
          ? "Select an active tenant for this unit."
          : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageBackNav parent={{ href: "/documents/notices", label: "LTB Notices" }} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">LTB Notice Wizard</h1>
          <p className="text-muted">
            Step through the official Ontario LTB N-series forms with tenant and property details
            pre-filled.
          </p>
        </div>
        <ButtonLink href="/documents/notices" variant="outline" size="sm">
          Back to notices
        </ButtonLink>
      </div>

      {errorMessage && (
        <FlashAlert variant="error" clearParams={["error"]}>
          {errorMessage}
        </FlashAlert>
      )}

      <Alert variant="info">
        This wizard generates a draft PDF aligned with the official LTB form. Always review against
        the blank PDF from the Landlord and Tenant Board before serving the notice.
      </Alert>

      <LtbNoticeWizardForm
        action={generateLtbNoticeAction}
        forms={LTB_FORMS}
        properties={wizardProperties}
        tenants={wizardTenants}
        landlord={{
          name: user.settings?.landlordName || user.name || user.email,
          email: user.email,
        }}
        defaultFormCode={params.formCode || "N4"}
        defaultPropertyId={params.propertyId}
        defaultUnitId={params.unitId}
        defaultTenantId={params.tenantId}
      />
    </div>
  );
}
