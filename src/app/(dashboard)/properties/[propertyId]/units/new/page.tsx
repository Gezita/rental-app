import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createUnitAction } from "@/app/actions";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";

export default async function NewUnitPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const user = await requireUser();
  const property = await prisma.property.findFirst({
    where: { id: propertyId, members: { some: { userId: user.id } } },
  });
  if (!property) notFound();

  const createUnit = createUnitAction.bind(null, propertyId);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageBackNav parent={{ href: `/properties/${propertyId}`, label: property.name }} />
      <div>
        <h1 className="text-2xl font-bold">Add Unit</h1>
        <p className="text-muted">Define rent and due date for this unit</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUnit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Unit Name</Label>
              <Input id="name" name="name" placeholder="Main Floor, Basement, Unit 1" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rentAmount">Monthly Rent ($)</Label>
                <Input id="rentAmount" name="rentAmount" type="number" step="0.01" min="0" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rentDueDay">Rent Due Day (1-31)</Label>
                <Input id="rentDueDay" name="rentDueDay" type="number" min="1" max="31" defaultValue="1" required />
              </div>
            </div>
            <Button type="submit">Add unit</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
