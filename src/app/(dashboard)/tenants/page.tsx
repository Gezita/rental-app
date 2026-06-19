import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageTabs } from "@/components/layout/page-tabs";
import { portfolioTabs } from "@/lib/section-tabs";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";

export default async function TenantsHubPage() {
  const user = await requireUser();

  const properties = await prisma.property.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      units: {
        include: {
          tenants: {
            where: { isActive: true },
            orderBy: { lastName: "asc" },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const activeTenantCount = properties.reduce(
    (sum, property) =>
      sum + property.units.reduce((unitSum, unit) => unitSum + unit.tenants.length, 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageTabs tabs={portfolioTabs} />
      <PageHeader
        title="Tenants"
        description="Active tenants across your portfolio — open a unit to edit details, lease, or billing."
      />

      {properties.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted">
              Add a property first.{" "}
              <Link href="/properties/new" className="font-medium text-primary-hover underline">
                Create property
              </Link>
            </p>
          </CardContent>
        </Card>
      ) : activeTenantCount === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted">
              No active tenants yet.{" "}
              <Link href="/properties" className="font-medium text-primary-hover underline">
                Open a property
              </Link>{" "}
              and add a unit with a tenant.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {properties.map((property) => {
            const tenants = property.units.flatMap((unit) =>
              unit.tenants.map((tenant) => ({ tenant, unit }))
            );
            if (tenants.length === 0) return null;

            return (
              <Card key={property.id}>
                <CardHeader>
                  <CardTitle>{property.name}</CardTitle>
                  <CardDescription>
                    {tenants.length} active tenant{tenants.length === 1 ? "" : "s"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Tenant</Th>
                        <Th>Unit</Th>
                        <Th></Th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map(({ tenant, unit }) => (
                        <Tr key={tenant.id}>
                          <Td>
                            <p className="font-medium">
                              {tenant.firstName} {tenant.lastName}
                            </p>
                            {tenant.email && (
                              <p className="text-xs text-muted">{tenant.email}</p>
                            )}
                          </Td>
                          <Td>
                            <Badge variant="secondary">{unit.name}</Badge>
                          </Td>
                          <Td>
                            <Link href={`/properties/${property.id}/units/${unit.id}`}>
                              <Button variant="ghost" size="sm">
                                View unit
                              </Button>
                            </Link>
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
