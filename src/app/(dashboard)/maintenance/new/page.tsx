import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createMaintenanceAction } from "@/app/actions/app";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from "@/components/ui";

export default async function NewMaintenancePage() {
  const user = await requireUser();

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    include: { units: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageBackNav parent={{ href: "/maintenance", label: "Maintenance" }} />
      <div>
        <h1 className="text-2xl font-bold">Add Maintenance Record</h1>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted">
              Add a property first.{" "}
              <Link href="/properties/new" className="underline">
                Create property
              </Link>
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createMaintenanceAction} className="space-y-4" encType="multipart/form-data">
              <div className="space-y-2">
                <Label htmlFor="propertyId">Property</Label>
                <Select id="propertyId" name="propertyId" required defaultValue={properties[0]?.id}>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitId">Unit (optional)</Label>
                <Select id="unitId" name="unitId" defaultValue="">
                  <option value="">Property-wide</option>
                  {properties.flatMap((p) =>
                    p.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {p.name} · {u.name}
                      </option>
                    ))
                  )}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="Fix leaking faucet" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select id="category" name="category" defaultValue="general_repair">
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="hvac">HVAC</option>
                    <option value="appliance">Appliance</option>
                    <option value="general_repair">General Repair</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" name="status" defaultValue="planned">
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendorName">Vendor</Label>
                  <Input id="vendorName" name="vendorName" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost ($)</Label>
                  <Input id="cost" name="cost" type="number" step="0.01" min="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">Invoice / Photo</Label>
                <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" />
              </div>
              <Button type="submit">Save Record</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
