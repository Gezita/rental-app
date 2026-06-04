import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Tr } from "@/components/ui";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const user = await requireUser();
  const { deleted } = await searchParams;

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    include: {
      units: true,
      _count: { select: { utilityBills: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageBackNav />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-slate-500">Manage your rental properties and units</p>
        </div>
        <Link href="/properties/new">
          <Button>Add Property</Button>
        </Link>
      </div>

      {deleted && <Alert>Property deleted.</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>All Properties</CardTitle>
        </CardHeader>
        <CardContent>
          {properties.length === 0 ? (
            <p className="text-sm text-slate-500">No properties yet. Add your first property to get started.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Address</Th>
                  <Th>Units</Th>
                  <Th>Monthly Rent</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => {
                  const monthlyRent = property.units.reduce((s, u) => s + u.rentAmountCents, 0);
                  return (
                    <Tr key={property.id}>
                      <Td className="font-medium">{property.name}</Td>
                      <Td>
                        {property.addressLine1}, {property.city}
                      </Td>
                      <Td>{property.units.length}</Td>
                      <Td>{formatMoney(monthlyRent)}</Td>
                      <Td>
                        <Link href={`/properties/${property.id}`}>
                          <Button variant="outline" size="sm">
                            Open
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
    </div>
  );
}
