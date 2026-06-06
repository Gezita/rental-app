import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { FlashAlert } from "@/components/flash-alert";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button, Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Tr } from "@/components/ui";

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
      <PageHeader
        title="Properties"
        description="Manage your rental properties and units"
        actions={
          <Link href="/properties/new">
            <Button>Add Property</Button>
          </Link>
        }
      />

      {deleted && <FlashAlert clearParams={["deleted"]}>Property deleted.</FlashAlert>}

      <Card>
        <CardHeader>
          <CardTitle>All Properties</CardTitle>
        </CardHeader>
        <CardContent>
          {properties.length === 0 ? (
            <p className="text-sm text-muted">No properties yet. Add your first property to get started.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Address</Th>
                  <Th>Units</Th>
                  <Th>Scheduled rent</Th>
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
