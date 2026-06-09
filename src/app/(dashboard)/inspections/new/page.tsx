import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createInspectionAction } from "@/app/actions/inspections";
import { DEFAULT_INSPECTION_CHECKLIST } from "@/lib/inspection-checklist";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { PageHeader } from "@/components/dashboard/page-header";
import { FlashAlert } from "@/components/flash-alert";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from "@/components/ui";

export default async function NewInspectionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    include: { units: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageBackNav parent={{ href: "/inspections", label: "Inspections" }} />
      <PageHeader
        title="Start new inspection"
        description="Choose a property and unit, then work through the standard checklist."
      />

      {params.error === "property" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Please select a property.
        </FlashAlert>
      )}
      {params.error === "unit" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          The selected unit does not belong to that property.
        </FlashAlert>
      )}

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
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Inspection details</CardTitle>
              <CardDescription>Where are you inspecting?</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createInspectionAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyId">Property</Label>
                  <Select id="propertyId" name="propertyId" required defaultValue={properties[0]?.id}>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitId">Unit (optional)</Label>
                  <Select id="unitId" name="unitId" defaultValue="">
                    <option value="">Whole property / common areas</option>
                    {properties.flatMap((property) =>
                      property.units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {property.name} — {unit.name}
                        </option>
                      ))
                    )}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Inspection title</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g. Move-in inspection"
                    defaultValue="Move-in inspection"
                  />
                </div>
                <Button type="submit">Start checklist</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Checklist preview</CardTitle>
              <CardDescription>
                {DEFAULT_INSPECTION_CHECKLIST.length} areas to verify — add notes and photos for
                each item during the inspection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
                {DEFAULT_INSPECTION_CHECKLIST.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
