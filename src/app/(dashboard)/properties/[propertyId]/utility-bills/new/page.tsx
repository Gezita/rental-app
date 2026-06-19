import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createUtilityBillAction } from "@/app/actions";
import { UtilityBillUploadForm } from "@/components/utility-bill-upload-form";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export default async function NewUtilityBillPage({
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
      <PageHeader
        title="Upload utility bill"
        description="Enter the bill total and preview unit splits before saving."
      />

      <Card>
        <CardHeader>
          <CardTitle>Bill details</CardTitle>
        </CardHeader>
        <CardContent>
          <UtilityBillUploadForm
            action={createBill}
            propertyId={propertyId}
            defaultPeriodStart={monthStart}
            defaultPeriodEnd={today}
          />
        </CardContent>
      </Card>
    </div>
  );
}
