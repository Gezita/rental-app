import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export default async function UtilityBillsHubPage() {
  const user = await requireUser();

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    include: {
      _count: { select: { utilityBills: true, units: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utility bills"
        description="Upload monthly gas, water, and electricity bills so Zigglo can split costs by unit."
      />

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Add a property before you can upload utility bills."
          primaryAction={{ href: "/properties/new", label: "Add property" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {properties.map((property) => (
            <Card key={property.id}>
              <CardHeader>
                <CardTitle>{property.name}</CardTitle>
                <CardDescription>
                  {property._count.units} unit{property._count.units === 1 ? "" : "s"} ·{" "}
                  {property._count.utilityBills} bill
                  {property._count.utilityBills === 1 ? "" : "s"} on file
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Link href={`/properties/${property.id}/utility-bills/import`}>
                  <Button variant="outline" size="sm">
                    Import bill spreadsheet
                  </Button>
                </Link>
                <Link href={`/properties/${property.id}/utility-bills/new`}>
                  <Button variant="outline" size="sm">
                    Upload bill and preview splits
                  </Button>
                </Link>
                <Link href={`/properties/${property.id}/utility-bills`}>
                  <Button variant="ghost" size="sm">
                    View all bills
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
