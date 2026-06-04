import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createUtilityBillAction } from "@/app/actions/app";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@/components/ui";

export default async function NewUtilityBillPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const user = await requireUser();
  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId: user.id },
  });
  if (!property) notFound();

  const createBill = createUtilityBillAction.bind(null, propertyId);
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageBackNav
        parent={{
          href: `/properties/${propertyId}/utility-bills`,
          label: "Utility Bills",
        }}
      />
      <div>
        <h1 className="text-2xl font-bold">Upload Utility Bill</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bill Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createBill} className="space-y-4" encType="multipart/form-data">
            <div className="space-y-2">
              <Label htmlFor="utilityType">Utility Type</Label>
              <Select id="utilityType" name="utilityType" defaultValue="gas">
                <option value="gas">Gas</option>
                <option value="water">Water</option>
                <option value="electricity">Electricity</option>
                <option value="internet">Internet</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerName">Provider</Label>
              <Input id="providerName" name="providerName" placeholder="Enbridge, Hydro One..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billingPeriodStart">Period Start</Label>
                <Input id="billingPeriodStart" name="billingPeriodStart" type="date" defaultValue={monthStart} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingPeriodEnd">Period End</Label>
                <Input id="billingPeriodEnd" name="billingPeriodEnd" type="date" defaultValue={today} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" name="dueDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Bill PDF or Image</Label>
              <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" />
            </div>
            <Button type="submit">Upload & Calculate Splits</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
