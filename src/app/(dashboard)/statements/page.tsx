import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { syncOverdueStatements } from "@/lib/overdue";
import { MONTH_NAMES } from "@/lib/statements";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ generated?: string }>;
}) {
  const user = await requireUser();
  const { generated } = await searchParams;

  await syncOverdueStatements(user.id);

  const statements = await prisma.statement.findMany({
    where: { unit: { property: { userId: user.id } } },
    include: {
      tenant: true,
      unit: { include: { property: true } },
    },
    orderBy: [{ statementYear: "desc" }, { statementMonth: "desc" }],
  });

  return (
    <div className="space-y-6">
      <PageBackNav />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Statements</h1>
          <p className="text-slate-500">Monthly tenant billing statements</p>
        </div>
        <Link href="/statements/generate">
          <Button>Generate Statements</Button>
        </Link>
      </div>

      {generated && <Alert>Statements generated as drafts. Review and send when ready.</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>All Statements</CardTitle>
        </CardHeader>
        <CardContent>
          {statements.length === 0 ? (
            <p className="text-sm text-slate-500">
              No statements yet.{" "}
              <Link href="/statements/generate" className="underline">
                Generate your first statements
              </Link>
            </p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Number</Th>
                  <Th>Property / Unit</Th>
                  <Th>Tenant</Th>
                  <Th>Period</Th>
                  <Th>Total</Th>
                  <Th>Workflow</Th>
                  <Th>Payment</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {statements.map((s) => (
                  <Tr key={s.id}>
                    <Td>{s.statementNumber}</Td>
                    <Td>
                      {s.unit.property.name} · {s.unit.name}
                    </Td>
                    <Td>
                      {s.tenant.firstName} {s.tenant.lastName}
                    </Td>
                    <Td>
                      {MONTH_NAMES[s.statementMonth - 1]} {s.statementYear}
                    </Td>
                    <Td>{formatMoney(s.totalDueCents)}</Td>
                    <Td className="capitalize text-slate-600">{s.status}</Td>
                    <Td>
                      <PaymentStatusBadge
                        status={s.status}
                        totalDueCents={s.totalDueCents}
                        paidAmountCents={s.paidAmountCents}
                        stripeCheckoutSessionId={s.stripeCheckoutSessionId}
                      />
                    </Td>
                    <Td>
                      <Link href={`/statements/${s.id}`}>
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
