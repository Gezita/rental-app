import Link from "next/link";
import { notFound } from "next/navigation";
import { generateLeaseAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { buildUtilityTerms, formatLeaseTerm } from "@/lib/lease-wizard";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { FlashAlert } from "@/components/flash-alert";
import { SubmitButton } from "@/components/submit-button";
import {
  Alert,
  Button,
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

export default async function LeaseWizardPage({
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
    activeLease?.leaseStartDate ??
    tenant?.moveInDate ??
    new Date();
  const defaultEnd = activeLease?.leaseEndDate;
  const utilityPreview = buildUtilityTerms(unit.utilityRules);
  const generateLease = generateLeaseAction.bind(null, unitId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageBackNav
        parent={{
          href: `/properties/${propertyId}/units/${unitId}`,
          label: `${unit.property.name} · ${unit.name}`,
        }}
      />

      <div>
        <h1 className="text-2xl font-bold">Lease wizard</h1>
        <p className="text-muted">
          Build a tenancy agreement from your property, tenant, and utility split rules.
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
                Utility terms are pulled from this unit&apos;s split rules — the same logic used on
                monthly statements.
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
                <span className="text-muted">Rent:</span> {formatMoney(unit.rentAmountCents)} / month
                (due day {unit.rentDueDay})
              </p>
              <div>
                <p className="text-muted">Utilities:</p>
                <ul className="mt-1 list-inside list-disc text-muted-foreground">
                  {utilityPreview.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Alert variant="info">
            For new Ontario tenancies, landlords must generally use the Ontario Standard Lease
            (Form 2229E). This wizard produces a Zigglo summary agreement with your billing rules
            embedded — use alongside or after the official form as your record.
          </Alert>

          <form action={generateLease} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Term & rent</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="leaseStartDate">Lease start</Label>
                  <Input
                    id="leaseStartDate"
                    name="leaseStartDate"
                    type="date"
                    required
                    defaultValue={defaultStart.toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leaseEndDate">Lease end (optional)</Label>
                  <Input
                    id="leaseEndDate"
                    name="leaseEndDate"
                    type="date"
                    defaultValue={defaultEnd?.toISOString().split("T")[0] ?? ""}
                  />
                  <p className="text-xs text-muted">
                    Leave blank for month-to-month. Preview:{" "}
                    {formatLeaseTerm(defaultEnd)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="securityDeposit">Rent deposit ($)</Label>
                  <Input
                    id="securityDeposit"
                    name="securityDeposit"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 2300.00"
                    defaultValue={
                      activeLease?.securityDepositCents
                        ? (activeLease.securityDepositCents / 100).toFixed(2)
                        : ""
                    }
                  />
                </div>
                <div className="flex flex-col justify-end gap-3 sm:col-span-2 sm:flex-row sm:flex-wrap">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="lastMonthRentDeposit"
                      defaultChecked={activeLease?.lastMonthRentDeposit ?? false}
                    />
                    Last month&apos;s rent collected
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="parkingIncluded" />
                    Parking included
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="smokingAllowed" />
                    Smoking permitted
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>House rules</CardTitle>
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
                <div className="space-y-2">
                  <Label htmlFor="additionalTerms">Additional terms (optional)</Label>
                  <Textarea
                    id="additionalTerms"
                    name="additionalTerms"
                    rows={4}
                    placeholder="e.g. Snow removal, storage locker, key deposit…"
                    defaultValue={activeLease?.additionalTerms ?? ""}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
              <SubmitButton pendingLabel="Generating PDF…">Generate lease PDF</SubmitButton>
              <Link href={`/properties/${propertyId}/units/${unitId}/utilities`}>
                <Button type="button" variant="outline">
                  Edit utility rules
                </Button>
              </Link>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
