import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { buildT776Report } from "@/lib/t776-report";
import { formatMoney } from "@/lib/money";
import { ExportT776Form } from "@/components/export-t776-form";
import { FlashAlert } from "@/components/flash-alert";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Alert,
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

function yearOptions() {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= current - 10; y--) years.push(y);
  return years;
}

export default async function TaxReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    exported?: string;
    documentId?: string;
    error?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const years = yearOptions();
  const selectedYear = params.year
    ? parseInt(params.year, 10)
    : new Date().getFullYear() - (new Date().getMonth() < 3 ? 1 : 0);

  const report = await buildT776Report(user.id, selectedYear);
  const missingFinances = report.properties.some(
    (p) => p.propertyTaxCents === 0 && p.insuranceCents === 0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax reports"
        description="Annual rental income mapped to CRA Form T776 — export fills the official T776 E (25) PDF"
        actions={<ExportT776Form years={years} defaultYear={selectedYear} />}
      />

      {params.exported && params.documentId && (
        <FlashAlert clearParams={["exported", "documentId"]} autoDismissMs={0}>
          Tax summary saved.{" "}
          <Link
            href={`/api/documents/${params.documentId}`}
            target="_blank"
            className="font-medium underline"
          >
            Open PDF again
          </Link>
        </FlashAlert>
      )}
      {params.error && (
        <FlashAlert variant="error" clearParams={["error"]}>
          {decodeURIComponent(params.error)}
        </FlashAlert>
      )}

      <div className="flex flex-wrap gap-2">
        {years.slice(0, 5).map((y) => (
          <Link key={y} href={`/billing/tax-reports?year=${y}`}>
            <Button variant={y === selectedYear ? "default" : "outline"} size="sm">
              {y}
            </Button>
          </Link>
        ))}
      </div>

      {missingFinances && (
        <Alert variant="warning">
          Some properties are missing annual property tax or insurance amounts. Add them on each
          property page under <strong>Property finances</strong> for a complete T776 summary.
        </Alert>
      )}

      <Alert variant="info">
        Income is based on payments recorded in Zigglo during {selectedYear}. Expenses use
        maintenance records, utility bills (net of tenant recoveries on statements), and annual
        amounts you enter per property. Verify with your accountant before filing.
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gross rents (8141)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMoney(report.totals.grossRentalIncomeCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMoney(report.totals.totalExpensesCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Net rental income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-primary">
              {formatMoney(report.totals.netIncomeCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By property — {selectedYear}</CardTitle>
          <CardDescription>T776 line mapping for each rental property</CardDescription>
        </CardHeader>
        <CardContent>
          {report.properties.length === 0 ? (
            <p className="text-sm text-muted">
              No properties yet.{" "}
              <Link href="/properties/new" className="underline">
                Add a property
              </Link>
            </p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Property</Th>
                  <Th className="text-right">8141 Rents</Th>
                  <Th className="text-right">9180 Tax</Th>
                  <Th className="text-right">8690 Ins.</Th>
                  <Th className="text-right">8960 Maint.</Th>
                  <Th className="text-right">9220 Utils</Th>
                  <Th className="text-right">Net</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {report.properties.map((p) => (
                  <Tr key={p.propertyId}>
                    <Td>
                      <p className="font-medium">{p.propertyName}</p>
                      <p className="text-xs text-muted">{p.address}</p>
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatMoney(p.grossRentalIncomeCents)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatMoney(p.propertyTaxCents)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatMoney(p.insuranceCents)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatMoney(p.maintenanceCents)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatMoney(p.netUtilityExpenseCents)}
                    </Td>
                    <Td className="text-right font-medium tabular-nums">
                      {formatMoney(p.netIncomeCents)}
                    </Td>
                    <Td>
                      <Link href={`/properties/${p.propertyId}`}>
                        <Button variant="outline" size="sm">
                          Property
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
