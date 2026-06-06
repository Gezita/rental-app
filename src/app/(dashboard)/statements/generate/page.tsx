import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createPastStatementAction, generateStatementsAction } from "@/app/actions/app";
import { GenerateStatementsForm } from "@/components/generate-statements-form";
import { MONTH_NAMES } from "@/lib/statements";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { FlashAlert } from "@/components/flash-alert";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from "@/components/ui";

function yearOptions() {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current - 15; y <= current + 1; y++) years.push(y);
  return years;
}

export default async function GenerateStatementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    propertyId?: string;
    unitId?: string;
    month?: string;
    year?: string;
    generated?: string;
    error?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    include: {
      units: {
        orderBy: { name: "asc" },
        include: { tenants: { where: { isActive: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  const currentMonth = params.month
    ? parseInt(params.month, 10)
    : now.getMonth() + 1;
  const currentYear = params.year
    ? parseInt(params.year, 10)
    : now.getFullYear();
  const years = yearOptions();

  const propertyForUnit = params.unitId
    ? properties.find((property) => property.units.some((unit) => unit.id === params.unitId))
    : undefined;
  const resolvedPropertyId =
    params.propertyId || propertyForUnit?.id || properties[0]?.id;

  const propertyOptions = properties.map((property) => ({
    id: property.id,
    name: property.name,
    units: property.units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      tenantName: unit.tenants[0]
        ? `${unit.tenants[0].firstName} ${unit.tenants[0].lastName}`
        : null,
    })),
  }));

  const unitsWithTenants = properties.flatMap((property) =>
    property.units
      .filter((unit) => unit.tenants.length > 0)
      .map((unit) => ({
        id: unit.id,
        label: `${property.name} — ${unit.name}`,
        propertyId: property.id,
      }))
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageBackNav parent={{ href: "/statements", label: "Statements" }} />
      <div>
        <h1 className="text-2xl font-bold">Statements</h1>
        <p className="text-muted">
          Generate drafts using rent plus utility bills from the bill database for the selected
          month. Import amounts per property under Utility bills → Import amounts (.xlsx).
        </p>
      </div>

      {params.generated && (
        <FlashAlert clearParams={["generated"]}>
          Draft statements generated. Utility line items are filled only when bill data exists for
          that month.
        </FlashAlert>
      )}
      {params.error && (
        <FlashAlert variant="error" clearParams={["error"]}>
          {decodeURIComponent(params.error)}
        </FlashAlert>
      )}

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
        <>
          <Card>
            <CardHeader>
              <CardTitle>Generate monthly statements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted">
                Choose the property, month, and which units need a statement. Attach utility bill
                documents, add optional extra costs, and split property bills across units using each
                unit&apos;s utility rules.
              </p>
              <GenerateStatementsForm
                action={generateStatementsAction}
                properties={propertyOptions}
                defaultPropertyId={resolvedPropertyId}
                defaultUnitId={params.unitId}
                defaultMonth={currentMonth}
                defaultYear={currentYear}
                years={years}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create past statement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted">
                Backfill a single month for one unit only. Set payment status (unpaid, paid in full,
                or partial). Uses bill database entries for that month when available.
              </p>
              {unitsWithTenants.length === 0 ? (
                <p className="text-sm text-muted">Add a unit with an active tenant first.</p>
              ) : (
                <form action={createPastStatementAction} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="past-unitId">Unit</Label>
                    <Select
                      id="past-unitId"
                      name="unitId"
                      required
                      defaultValue={params.unitId || unitsWithTenants[0]?.id}
                    >
                      {unitsWithTenants.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="past-month">Month</Label>
                      <Select id="past-month" name="month" defaultValue="1">
                        {MONTH_NAMES.map((name, i) => (
                          <option key={name} value={String(i + 1)}>
                            {name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="past-year">Year</Label>
                      <Select id="past-year" name="year" defaultValue={String(currentYear - 1)}>
                        {years.map((y) => (
                          <option key={y} value={String(y)}>
                            {y}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <PaymentStatusFields idPrefix="past" />
                  <SubmitButton pendingLabel="Creating…">Create past statement</SubmitButton>
                </form>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function PaymentStatusFields({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-paymentStatus`}>Payment status</Label>
        <Select id={`${idPrefix}-paymentStatus`} name="paymentStatus" defaultValue="unpaid">
          <option value="unpaid">Unpaid / open</option>
          <option value="paid">Paid in full</option>
          <option value="partial">Partially paid</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-partialAmount`}>Amount paid (if partial)</Label>
        <Input
          id={`${idPrefix}-partialAmount`}
          name="partialAmount"
          placeholder="e.g. 500.00"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-paymentDate`}>Payment date</Label>
          <Input
            id={`${idPrefix}-paymentDate`}
            name="paymentDate"
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-paymentMethod`}>Method</Label>
          <Select id={`${idPrefix}-paymentMethod`} name="paymentMethod" defaultValue="e_transfer">
            <option value="e_transfer">E-Transfer</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
            <option value="bank_deposit">Bank Deposit</option>
            <option value="other">Other</option>
          </Select>
        </div>
      </div>
    </>
  );
}
