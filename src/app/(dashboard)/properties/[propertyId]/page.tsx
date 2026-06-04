import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePropertyAction } from "@/app/actions/app";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { PageBackNav } from "@/components/layout/page-back-nav";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  searchParams: Promise<{ error?: string; deleted?: string }>;
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
      utilityBills: { orderBy: { billingPeriodStart: "desc" }, take: 5 },
      maintenanceRecords: {
        where: { status: { in: ["planned", "in_progress"] } },
        take: 5,
      },
    },
  });

  if (!property) notFound();

  const monthlyRent = property.units.reduce((s, u) => s + u.rentAmountCents, 0);
  const deleteProperty = deletePropertyAction.bind(null, propertyId);

  return (
    <div className="space-y-6">
      <PageBackNav parent={{ href: "/properties", label: "Properties" }} />

      {query.deleted === "unit" && (
        <Alert>Unit deleted.</Alert>
      )}
      {query.error === "delete_confirm" && (
        <Alert variant="error">
          Delete cancelled — type the property name exactly to confirm.
        </Alert>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{property.name}</h1>
          <p className="text-slate-500">
            {property.addressLine1}, {property.city}
            {property.province ? `, ${property.province}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/properties/${propertyId}/utility-connect`}>
            <Button variant="outline">Green Button</Button>
          </Link>
          <Link href={`/properties/${propertyId}/utility-bills/new`}>
            <Button variant="outline">Upload Bill</Button>
          </Link>
          <Link href={`/properties/${propertyId}/units/new`}>
            <Button>Add Unit</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Units</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{property.units.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Rent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(monthlyRent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{property.maintenanceRecords.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Units</CardTitle>
          <Link href={`/properties/${propertyId}/units/new`}>
            <Button size="sm">Add Unit</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {property.units.length === 0 ? (
            <p className="text-sm text-slate-500">No units yet.</p>
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
        <Link href={`/properties/${propertyId}/utility-connect`}>
          <Button variant="outline">Green Button</Button>
        </Link>
        <Link href={`/properties/${propertyId}/utility-bills`}>
          <Button variant="outline">Utility Bills</Button>
        </Link>
        <Link href={`/statements/generate?propertyId=${propertyId}`}>
          <Button variant="outline">Generate Statements</Button>
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
