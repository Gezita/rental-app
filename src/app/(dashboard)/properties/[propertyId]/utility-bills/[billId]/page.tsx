import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { UTILITY_TYPE_LABELS } from "@/lib/billing-constants";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Tr } from "@/components/ui";

export default async function UtilityBillDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string; billId: string }>;
}) {
  const { propertyId, billId } = await params;
  const user = await requireUser();

  const bill = await prisma.utilityBill.findFirst({
    where: { id: billId, propertyId, property: { members: { some: { userId: user.id } } } },
    include: {
      property: true,
      splits: { include: { unit: true } },
      document: true,
    },
  });

  if (!bill) notFound();

  const totalSplitPct = bill.splits.reduce((s, split) => s + split.percentage, 0);

  return (
    <div className="space-y-6">
      <PageBackNav
        parent={{
          href: `/properties/${propertyId}/utility-bills`,
          label: `${bill.property.name} · Utility Bills`,
        }}
      />
      <div>
        <h1 className="text-2xl font-bold">
          {UTILITY_TYPE_LABELS[bill.utilityType]} Bill — {formatMoney(bill.amountCents)}
        </h1>
        <p className="text-muted">
          {bill.billingPeriodStart.toLocaleDateString()} – {bill.billingPeriodEnd.toLocaleDateString()}
        </p>
      </div>

      {!bill.document && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">
            Warning: No bill proof document attached.
          </CardContent>
        </Card>
      )}

      {totalSplitPct > 100 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-sm text-red-900">
            Split percentages total {totalSplitPct}% — exceeds 100%.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Split Preview by Unit</CardTitle>
        </CardHeader>
        <CardContent>
          {bill.splits.length === 0 ? (
            <p className="text-sm text-muted">
              No splits calculated. Set utility rules on each unit first.
            </p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Unit</Th>
                  <Th>Percentage</Th>
                  <Th>Amount</Th>
                  <Th>Override</Th>
                </tr>
              </thead>
              <tbody>
                {bill.splits.map((split) => (
                  <Tr key={split.id}>
                    <Td>{split.unit.name}</Td>
                    <Td>{split.percentage}%</Td>
                    <Td>{formatMoney(split.amountCents)}</Td>
                    <Td>
                      {split.isOverride ? <Badge variant="warning">Override</Badge> : "—"}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {bill.document && (
        <Link href={`/api/documents/${bill.document.id}`} target="_blank">
          <Button variant="outline">Download Bill Document</Button>
        </Link>
      )}
    </div>
  );
}
