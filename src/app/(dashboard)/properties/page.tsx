import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { FlashAlert } from "@/components/flash-alert";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageTabs } from "@/components/layout/page-tabs";
import { portfolioTabs } from "@/lib/section-tabs";
import { Button, Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Tr } from "@/components/ui";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const user = await requireUser();
  const { deleted } = await searchParams;

  const properties = await prisma.property.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      units: true,
      _count: { select: { utilityBills: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageTabs tabs={portfolioTabs} />
      <PageHeader
        title="Properties"
        description="Manage your rental properties and units"
        actions={
          <Link href="/properties/new">
            <Button>Add property</Button>
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
                  <Th className="hidden sm:table-cell">Address</Th>
                  <Th>Units</Th>
                  <Th className="hidden sm:table-cell">Scheduled rent</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => {
                  const monthlyRent = property.units.reduce((s, u) => s + u.rentAmountCents, 0);
                  return (
                    <Tr key={property.id} className="relative cursor-pointer">
                      <Td className="font-medium">
                        <Link
                          href={`/properties/${property.id}`}
                          aria-label={`Open ${property.name}`}
                          className="font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        >
                          {property.name}
                        </Link>
                        <div className="mt-0.5 text-xs text-muted sm:hidden">
                          {property.addressLine1}, {property.city}
                        </div>
                      </Td>
                      <Td className="hidden sm:table-cell">
                        {property.addressLine1}, {property.city}
                      </Td>
                      <Td>{property.units.length}</Td>
                      <Td className="hidden sm:table-cell">{formatMoney(monthlyRent)}</Td>
                      <Td className="w-10 pr-3 text-right text-muted-foreground">
                        <ChevronRight className="ml-auto h-4 w-4" />
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
