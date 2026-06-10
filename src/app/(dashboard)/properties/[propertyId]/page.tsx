import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleDollarSign, Home, Shield, Wrench } from "lucide-react";
import { deletePropertyAction, updatePropertyFinancesAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { FlashAlert } from "@/components/flash-alert";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ error?: string; deleted?: string; saved?: string }>;
}) {
  const { propertyId } = await params;
  const query = await searchParams;
  const user = await requireUser();

  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId: user.id },
    include: {
      units: {
        include: {
          tenants: { where: { isActive: true } },
        },
      },
      _count: {
        select: {
          maintenanceRecords: {
            where: { status: { in: ["planned", "in_progress"] } },
          },
        },
      },
    },
  });

  if (!property) notFound();

  const monthlyRent = property.units.reduce((s, u) => s + u.rentAmountCents, 0);
  const occupiedUnits = property.units.filter((u) => u.tenants.length > 0).length;
  const vacantUnits = property.units.length - occupiedUnits;
  const openMaintenanceCount = property._count.maintenanceRecords;
  const deleteProperty = deletePropertyAction.bind(null, propertyId);
  const updateFinances = updatePropertyFinancesAction.bind(null, propertyId);

  return (
    <div className="space-y-6">
      <PageBackNav parent={{ href: "/properties", label: "Properties" }} />

      {query.saved === "finances" && (
        <FlashAlert clearParams={["saved"]}>
          Property finances saved. These amounts feed your annual T776 tax summary.
        </FlashAlert>
      )}
      {query.deleted === "unit" && (
        <FlashAlert clearParams={["deleted"]}>Unit deleted.</FlashAlert>
      )}
      {query.error === "delete_confirm" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Delete cancelled — type the property name exactly to confirm.
        </FlashAlert>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{property.name}</h1>
          <p className="text-muted">
            {property.addressLine1}, {property.city}
            {property.province ? `, ${property.province}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/properties/${propertyId}/utility-bills/import`}>
            <Button variant="outline">Import bill spreadsheet</Button>
          </Link>
          <Link href={`/properties/${propertyId}/utility-bills/new`}>
            <Button variant="outline">Upload bill PDF</Button>
          </Link>
          <Link href={`/properties/${propertyId}/units/new`}>
            <Button>Add Unit</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Units"
          value={property.units.length}
          hint={`${occupiedUnits} occupied · ${vacantUnits} vacant`}
          icon={Home}
          accent="primary"
        />
        <StatCard
          label="Scheduled rent (all units)"
          value={formatMoney(monthlyRent)}
          icon={CircleDollarSign}
          accent="primary"
        />
        <StatCard
          label="Open maintenance"
          value={openMaintenanceCount}
          icon={Wrench}
          accent={openMaintenanceCount > 0 ? "warning" : "neutral"}
          href={`/maintenance?status=open&propertyId=${propertyId}`}
        />
        <StatCard
          label="Tax & insurance"
          value={
            property.annualPropertyTaxCents || property.annualInsurancePremiumCents
              ? formatMoney(
                  (property.annualPropertyTaxCents ?? 0) +
                    (property.annualInsurancePremiumCents ?? 0)
                )
              : "Not set"
          }
          hint={
            property.annualPropertyTaxCents || property.annualInsurancePremiumCents
              ? [
                  property.annualPropertyTaxCents
                    ? `${formatMoney(property.annualPropertyTaxCents)} tax`
                    : null,
                  property.annualInsurancePremiumCents
                    ? `${formatMoney(property.annualInsurancePremiumCents)} insurance`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Add below for T776"
          }
          icon={Shield}
          accent="neutral"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property finances</CardTitle>
          <CardDescription>
            Annual amounts for CRA Form T776 (lines 9180, 9200, 8710). Used in Tax Reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateFinances} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="annualPropertyTax">Annual property tax ($)</Label>
              <Input
                id="annualPropertyTax"
                name="annualPropertyTax"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 4200.00"
                defaultValue={
                  property.annualPropertyTaxCents
                    ? (property.annualPropertyTaxCents / 100).toFixed(2)
                    : ""
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRollNumber">Tax roll / account # (optional)</Label>
              <Input
                id="taxRollNumber"
                name="taxRollNumber"
                defaultValue={property.taxRollNumber ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annualInsurancePremium">Annual insurance ($)</Label>
              <Input
                id="annualInsurancePremium"
                name="annualInsurancePremium"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 1800.00"
                defaultValue={
                  property.annualInsurancePremiumCents
                    ? (property.annualInsurancePremiumCents / 100).toFixed(2)
                    : ""
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insuranceProvider">Insurer (optional)</Label>
              <Input
                id="insuranceProvider"
                name="insuranceProvider"
                defaultValue={property.insuranceProvider ?? ""}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="mortgageInterestAnnual">Annual mortgage interest ($)</Label>
              <Input
                id="mortgageInterestAnnual"
                name="mortgageInterestAnnual"
                type="number"
                step="0.01"
                min="0"
                placeholder="T776 line 8710"
                defaultValue={
                  property.mortgageInterestAnnualCents
                    ? (property.mortgageInterestAnnualCents / 100).toFixed(2)
                    : ""
                }
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Save finances</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Units</CardTitle>
          <Link href={`/properties/${propertyId}/units/new`}>
            <Button size="sm">Add Unit</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {property.units.length === 0 ? (
            <p className="text-sm text-muted">No units yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Unit</Th>
                  <Th>Tenant</Th>
                  <Th>Rent</Th>
                  <Th>Due Day</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {property.units.map((unit) => {
                  const tenant = unit.tenants[0];
                  return (
                    <Tr key={unit.id}>
                      <Td className="font-medium">{unit.name}</Td>
                      <Td>
                        {tenant ? `${tenant.firstName} ${tenant.lastName}` : (
                          <Badge variant="warning">No tenant</Badge>
                        )}
                      </Td>
                      <Td>{formatMoney(unit.rentAmountCents)}</Td>
                      <Td>{unit.rentDueDay}</Td>
                      <Td>
                        <Link href={`/properties/${propertyId}/units/${unit.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Link href={`/properties/${propertyId}/utility-bills/import`}>
          <Button variant="outline">Import bill spreadsheet</Button>
        </Link>
        <Link href={`/properties/${propertyId}/utility-bills`}>
          <Button variant="outline">Utility bills</Button>
        </Link>
        <Link href={`/billing/statements/generate?propertyId=${propertyId}`}>
          <Button variant="outline">Generate monthly statements</Button>
        </Link>
      </div>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-900">Delete property</CardTitle>
          <CardDescription>
            Permanently removes this property, all units, utility bills, statements, and
            maintenance records. Documents will be unlinked but not deleted. This cannot be
            undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmDeleteForm
            action={deleteProperty}
            entityName={property.name}
            buttonLabel="Delete property"
            description="All units and billing data under this property will be removed."
          />
        </CardContent>
      </Card>
    </div>
  );
}
