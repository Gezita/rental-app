import Link from "next/link";
import { notFound } from "next/navigation";
import type { UtilityType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { UTILITY_TYPE_LABELS } from "@/lib/billing-constants";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  isUtilityFilterType,
  UtilityBillsFilter,
} from "@/components/utility-bills-filter";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";

export default async function UtilityBillsPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { propertyId } = await params;
  const { type: typeParam } = await searchParams;
  const user = await requireUser();

  const property = await prisma.property.findFirst({
    where: { id: propertyId, members: { some: { userId: user.id } } },
  });
  if (!property) notFound();

  const activeType = isUtilityFilterType(typeParam) ? typeParam : "all";

  const allBills = await prisma.utilityBill.findMany({
    where: { propertyId },
    select: { utilityType: true },
  });

  const counts: Record<string, number> = { gas: 0, water: 0, electricity: 0 };
  for (const bill of allBills) {
    if (bill.utilityType in counts) {
      counts[bill.utilityType] += 1;
    }
  }

  const bills = await prisma.utilityBill.findMany({
    where: {
      propertyId,
      ...(activeType !== "all" ? { utilityType: activeType as UtilityType } : {}),
    },
    include: { splits: { include: { unit: true } }, document: true },
    orderBy: [{ billYear: "desc" }, { billMonth: "desc" }, { billingPeriodStart: "desc" }],
  });

  const filterLabel =
    activeType === "all"
      ? "All utilities"
      : UTILITY_TYPE_LABELS[activeType as UtilityType];

  return (
    <div className="space-y-6">
      <PageBackNav parent={{ href: `/properties/${propertyId}`, label: property.name }} />

      <PageHeader
        title="Utility bills"
        description={`${property.name} — imported amounts and uploaded bill PDFs`}
        actions={
          <>
            <Link href={`/properties/${propertyId}/utility-bills/import`}>
              <Button>Import bill spreadsheet</Button>
            </Link>
            <Link href={`/properties/${propertyId}/utility-bills/new`}>
              <Button variant="outline">Upload bill PDF</Button>
            </Link>
          </>
        }
      />

      <UtilityBillsFilter
        propertyId={propertyId}
        activeType={activeType}
        counts={counts}
      />

      <Card>
        <CardHeader>
          <CardTitle>{filterLabel}</CardTitle>
          <CardDescription>
            {bills.length === 0
              ? "No bills match this filter."
              : `${bills.length} bill${bills.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <p className="text-sm text-muted">
              {activeType === "all"
                ? "No utility bills uploaded yet."
                : `No ${UTILITY_TYPE_LABELS[activeType as UtilityType].toLowerCase()} bills yet. Upload a spreadsheet or add a bill manually.`}
            </p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Type</Th>
                  <Th>Provider</Th>
                  <Th>Source</Th>
                  <Th>Amount</Th>
                  <Th>Bill month</Th>
                  <Th>Due</Th>
                  <Th>Splits</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <Tr key={bill.id}>
                    <Td>{UTILITY_TYPE_LABELS[bill.utilityType]}</Td>
                    <Td>{bill.providerName || "—"}</Td>
                    <Td>
                      {bill.source === "spreadsheet" ? "Bill database" : "Manual + PDF"}
                    </Td>
                    <Td className="tabular-nums font-medium">{formatMoney(bill.amountCents)}</Td>
                    <Td>
                      {bill.billMonth && bill.billYear
                        ? `${bill.billMonth}/${bill.billYear}`
                        : `${bill.billingPeriodStart.toLocaleDateString()} – ${bill.billingPeriodEnd.toLocaleDateString()}`}
                    </Td>
                    <Td>{bill.dueDate?.toLocaleDateString() ?? "—"}</Td>
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
