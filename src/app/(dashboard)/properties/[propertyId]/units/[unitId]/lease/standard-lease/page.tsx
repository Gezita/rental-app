import Link from "next/link";
import { notFound } from "next/navigation";
import { generateStandardLease2229eAction } from "@/app/actions/leases";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UTILITY_TYPE_LABELS } from "@/lib/billing-constants";
import { buildUtilityTerms, formatLeaseTerm } from "@/lib/lease-wizard";
import { formatMoney } from "@/lib/money";
import { STANDARD_LEASE_2229E_URL } from "@/lib/standard-lease-2229e";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { FlashAlert } from "@/components/flash-alert";
import { SubmitButton } from "@/components/submit-button";
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import type { UtilityType } from "@prisma/client";

const SERVICE_OPTIONS = [
  "Gas",
  "Air conditioning",
  "Storage locker",
  "Laundry",
  "Guest parking",
  "Concierge",
];

export default async function StandardLeaseWizardPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string; unitId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { propertyId, unitId } = await params;
  const query = await searchParams;
  const user = await requireUser();

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, propertyId, property: { userId: user.id } },
    include: {
      property: true,
      utilityRules: true,
      tenants: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
      leases: {
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!unit) notFound();

  const tenant = unit.tenants[0];
  const activeLease = unit.leases[0];
  const settings = user.settings;
  const landlordName = settings?.landlordName || user.name || user.email;
  const defaultStart =
    activeLease?.leaseStartDate ?? tenant?.moveInDate ?? new Date();
  const defaultEnd = activeLease?.leaseEndDate;
  const utilityPreview = buildUtilityTerms(unit.utilityRules);
  const generateLease = generateStandardLease2229eAction.bind(null, unitId);

  const tenantPaysUtilities = unit.utilityRules
    .filter((rule) => rule.tenantPays && !rule.includedInRent)
    .map((rule) => UTILITY_TYPE_LABELS[rule.utilityType as UtilityType]);
  const landlordPaysUtilities = unit.utilityRules
    .filter((rule) => !rule.tenantPays || rule.includedInRent)
    .map((rule) => UTILITY_TYPE_LABELS[rule.utilityType as UtilityType]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageBackNav
        parent={{
          href: `/properties/${propertyId}/units/${unitId}`,
          label: `${unit.property.name} · ${unit.name}`,
        }}
      />

      <div>
        <h1 className="text-2xl font-bold">Ontario Standard Lease Wizard</h1>
        <p className="text-muted">
          Form 2229E (December 2020) — pre-fill Parts 1–7 from your property and tenant records.
        </p>
      </div>

      {query.error && (
        <FlashAlert variant="error" clearParams={["error"]}>
          {decodeURIComponent(query.error)}
        </FlashAlert>
      )}

      {!tenant ? (
        <Alert variant="warning">
          Add an active tenant on the unit page before generating a lease.
        </Alert>
      ) : (
        <>
          <Card className="border-primary/20 bg-primary-muted/20">
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>
                Pulls from your unit, tenant, and utility split rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted">Landlord:</span> {landlordName}
              </p>
              <p>
                <span className="text-muted">Tenant:</span> {tenant.firstName} {tenant.lastName}
              </p>
              <p>
                <span className="text-muted">Address:</span> {unit.property.addressLine1},{" "}
                {unit.property.city}
              </p>
              <p>
                <span className="text-muted">Rent:</span> {formatMoney(unit.rentAmountCents)} / month
              </p>
              <ul className="list-inside list-disc text-muted-foreground">
                {utilityPreview.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Alert variant="info">
            Generates a draft PDF organized by the official 2229E sections. Copy the details into
            the{" "}
            <a
              href={STANDARD_LEASE_2229E_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              fillable Standard Lease PDF
            </a>{" "}
            from the Ontario government before signing.
          </Alert>

          <form action={generateLease} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Part 4 — Term</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="leaseStartDate">Start date</Label>
                  <Input
                    id="leaseStartDate"
                    name="leaseStartDate"
                    type="date"
                    required
                    defaultValue={defaultStart.toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leaseEndDate">End date (optional)</Label>
                  <Input
                    id="leaseEndDate"
                    name="leaseEndDate"
                    type="date"
                    defaultValue={defaultEnd?.toISOString().split("T")[0] ?? ""}
                  />
                  <p className="text-xs text-muted">Preview: {formatLeaseTerm(defaultEnd)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Part 5 — Rent</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="rentPaymentMethod">Payment method</Label>
                  <Input
                    id="rentPaymentMethod"
                    name="rentPaymentMethod"
                    placeholder="e.g. E-transfer to landlord@email.com"
                    defaultValue={settings?.paymentInstructions ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partialRent">Partial rent for first period ($)</Label>
                  <Input
                    id="partialRent"
                    name="partialRent"
                    type="number"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partialRentStartDate">Partial rent from</Label>
                  <Input id="partialRentStartDate" name="partialRentStartDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partialRentEndDate">Partial rent to</Label>
                  <Input id="partialRentEndDate" name="partialRentEndDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rentDeposit">Rent deposit ($)</Label>
                  <Input
                    id="rentDeposit"
                    name="rentDeposit"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={
                      activeLease?.securityDepositCents
                        ? (activeLease.securityDepositCents / 100).toFixed(2)
                        : ""
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keyDeposit">Key deposit ($)</Label>
                  <Input id="keyDeposit" name="keyDeposit" type="number" step="0.01" min="0" />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    name="lastMonthRentDeposit"
                    defaultChecked={activeLease?.lastMonthRentDeposit ?? false}
                  />
                  Last month&apos;s rent collected
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Part 6 — Services & utilities</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="servicesIncluded">Services included in rent</Label>
                  <Select id="servicesIncluded" name="servicesIncluded" multiple className="min-h-28">
                    {SERVICE_OPTIONS.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utilitiesTenantPays">Utilities tenant pays</Label>
                  <Select
                    id="utilitiesTenantPays"
                    name="utilitiesTenantPays"
                    multiple
                    className="min-h-28"
                    defaultValue={tenantPaysUtilities}
                  >
                    {Object.values(UTILITY_TYPE_LABELS).map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="utilitiesLandlordPays">Utilities landlord pays</Label>
                  <Select
                    id="utilitiesLandlordPays"
                    name="utilitiesLandlordPays"
                    multiple
                    className="min-h-28"
                    defaultValue={landlordPaysUtilities}
                  >
                    {Object.values(UTILITY_TYPE_LABELS).map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="parkingIncluded" />
                  Parking included in rent
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Part 7 — Additional terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="petsAllowed">Pets</Label>
                  <Select id="petsAllowed" name="petsAllowed" defaultValue="no">
                    <option value="no">No pets without permission</option>
                    <option value="with_permission">With written permission</option>
                    <option value="yes">Pets allowed</option>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="smokingAllowed" />
                  Smoking permitted
                </label>
                <div className="space-y-2">
                  <Label htmlFor="additionalTerms">Additional terms (optional)</Label>
                  <Textarea
                    id="additionalTerms"
                    name="additionalTerms"
                    rows={4}
                    placeholder="Attach as separate pages when using the official 2229E form."
                    defaultValue={activeLease?.additionalTerms ?? ""}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
              <SubmitButton pendingLabel="Generating PDF…">
                Generate Standard Lease PDF
              </SubmitButton>
              <Link href={`/properties/${propertyId}/units/${unitId}/lease/wizard`}>
                <Button type="button" variant="outline">
                  Zigglo summary lease
                </Button>
              </Link>
              <ButtonLink
                href={STANDARD_LEASE_2229E_URL}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
              >
                Official 2229E PDF
              </ButtonLink>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
