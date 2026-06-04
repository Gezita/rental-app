import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateStatementsAction } from "@/app/actions/app";
import { MONTH_NAMES } from "@/lib/statements";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { Button, Card, CardContent, CardHeader, CardTitle, Label, Select } from "@/components/ui";

export default async function GenerateStatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const user = await requireUser();
  const { propertyId: defaultPropertyId } = await searchParams;

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageBackNav parent={{ href: "/statements", label: "Statements" }} />
      <div>
        <h1 className="text-2xl font-bold">Generate Monthly Statements</h1>
        <p className="text-slate-500">
          Creates draft statements with rent, utility charges, and any outstanding balance from
          the previous month
        </p>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">
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
            <CardTitle>Select Period</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={generateStatementsAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="propertyId">Property</Label>
                <Select
                  id="propertyId"
                  name="propertyId"
                  defaultValue={defaultPropertyId || properties[0]?.id}
                  required
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="month">Month</Label>
                  <Select id="month" name="month" defaultValue={String(currentMonth)}>
                    {MONTH_NAMES.map((name, i) => (
                      <option key={name} value={String(i + 1)}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Select id="year" name="year" defaultValue={String(currentYear)}>
                    {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <Button type="submit">Generate Draft Statements</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
