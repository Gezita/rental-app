import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button, Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Tr } from "@/components/ui";

export default async function BillingPaymentsPage() {
  const user = await requireUser();

  const payments = await prisma.payment.findMany({
    where: { statement: { unit: { property: { members: { some: { userId: user.id } } } } } },
    include: {
      receipt: { include: { pdfDocument: true } },
      statement: {
        include: {
          tenant: true,
          unit: { include: { property: true } },
        },
      },
    },
    orderBy: { paymentDate: "desc" },
    take: 100,
  });

  const totalCollected = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const recentCount = payments.filter((payment) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return payment.paymentDate >= thirtyDaysAgo;
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track rent and utility payments recorded across your portfolio."
        actions={
          <Link href="/billing/statements">
            <Button variant="outline">View statements</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Lifetime collected
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-success">
              {formatMoney(totalCollected)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Payments in last 30 days
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{recentCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent payments</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState
              title="No payments recorded yet"
              description="Record a payment from a statement detail page after you send monthly billing."
              primaryAction={{ href: "/billing/statements", label: "View statements" }}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Tenant</Th>
                  <Th>Unit</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Method</Th>
                  <Th>Receipt</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <Tr key={payment.id}>
                    <Td>{payment.paymentDate.toLocaleDateString("en-CA")}</Td>
                    <Td>
                      {payment.statement.tenant.firstName} {payment.statement.tenant.lastName}
                    </Td>
                    <Td>
                      <p>{payment.statement.unit.name}</p>
                      <p className="text-xs text-muted">{payment.statement.unit.property.name}</p>
                    </Td>
                    <Td className="text-right font-medium tabular-nums text-success">
                      {formatMoney(payment.amountCents)}
                    </Td>
                    <Td>
                      <StatusBadge
                        status={payment.paymentMethod}
                        label={payment.paymentMethod.replace("_", " ")}
                      />
                    </Td>
                    <Td>
                      {payment.receipt?.pdfDocumentId ? (
                        <Link
                          href={`/api/documents/${payment.receipt.pdfDocumentId}`}
                          target="_blank"
                          className="text-sm font-medium text-primary-hover underline"
                        >
                          Download
                        </Link>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <Link href={`/billing/statements/${payment.statement.id}`}>
                        <Button variant="outline" size="sm">
                          View statement
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
