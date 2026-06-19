import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { MONTH_NAMES } from "@/lib/billing-constants";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Tr } from "@/components/ui";

export default async function UnitStatementsPage({
  params,
}: {
  params: Promise<{ propertyId: string; unitId: string }>;
}) {
  const { propertyId, unitId } = await params;
  const user = await requireUser();

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, propertyId, property: { members: { some: { userId: user.id } } } },
    include: {
      property: true,
      statements: {
        orderBy: [{ statementYear: "desc" }, { statementMonth: "desc" }],
      },
    },
  });

  if (!unit) notFound();

  return (
    <div className="space-y-6">
      <PageBackNav
        parent={{
          href: `/properties/${propertyId}/units/${unitId}`,
          label: `${unit.property.name} · ${unit.name}`,
        }}
      />
      <div>
        <h1 className="text-2xl font-bold">Statements</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Statements</CardTitle>
          <Link href={`/billing/statements/generate?propertyId=${propertyId}&unitId=${unitId}`}>
            <Button size="sm">Generate for {unit.name}</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {unit.statements.length === 0 ? (
            <p className="text-sm text-muted">No statements for this unit yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Number</Th>
                  <Th>Period</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {unit.statements.map((s) => (
                  <Tr key={s.id}>
                    <Td>{s.statementNumber}</Td>
                    <Td>
                      {MONTH_NAMES[s.statementMonth - 1]} {s.statementYear}
                    </Td>
                    <Td>{formatMoney(s.totalDueCents)}</Td>
                    <Td>
                      <Badge variant={s.status === "paid" ? "success" : "secondary"}>
                        {s.status}
                      </Badge>
                    </Td>
                    <Td>
                      <Link href={`/billing/statements/${s.id}`}>
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
