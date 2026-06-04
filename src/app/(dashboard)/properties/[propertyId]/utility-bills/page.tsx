import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { UTILITY_TYPE_LABELS } from "@/lib/statements";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { Button, Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Tr } from "@/components/ui";

export default async function UtilityBillsPage({
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

  const bills = await prisma.utilityBill.findMany({
    where: { propertyId },
    include: { splits: { include: { unit: true } }, document: true },
    orderBy: { billingPeriodStart: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageBackNav parent={{ href: `/properties/${propertyId}`, label: property.name }} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Utility Bills</h1>
        </div>
        <Link href={`/properties/${propertyId}/utility-bills/new`}>
          <Button>Upload Bill</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bills</CardTitle>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <p className="text-sm text-slate-500">No utility bills uploaded yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Type</Th>
                  <Th>Provider</Th>
                  <Th>Source</Th>
                  <Th>Amount</Th>
                  <Th>Period</Th>
                  <Th>Splits</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <Tr key={bill.id}>
                    <Td>{UTILITY_TYPE_LABELS[bill.utilityType]}</Td>
                    <Td>{bill.providerName || "—"}</Td>
                    <Td>{bill.source === "green_button" ? "Green Button" : "Manual"}</Td>
                    <Td>{formatMoney(bill.amountCents)}</Td>
                    <Td>
                      {bill.billingPeriodStart.toLocaleDateString()} –{" "}
                      {bill.billingPeriodEnd.toLocaleDateString()}
                    </Td>
                    <Td>{bill.splits.length} units</Td>
                    <Td>
                      <Link href={`/properties/${propertyId}/utility-bills/${bill.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
