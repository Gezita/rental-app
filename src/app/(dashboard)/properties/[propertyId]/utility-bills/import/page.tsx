import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  addUtilityBillDatabaseAction,
  importUtilityBillsXlsxAction,
  previewUtilityBillsImportAction,
} from "@/app/actions/app";
import {
  MONTH_NAMES,
  SPREADSHEET_UTILITY_OPTIONS,
  yearOptions,
} from "@/lib/billing-constants";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { FlashAlert } from "@/components/flash-alert";
import { SubmitButton } from "@/components/submit-button";
import { UtilityBillsImportForm } from "@/components/utility-bills-import-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from "@/components/ui";

export default async function UtilityBillsImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ imported?: string; added?: string; error?: string }>;
}) {
  const { propertyId } = await params;
  const query = await searchParams;
  const user = await requireUser();

  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId: user.id },
    include: {
      units: {
        orderBy: { name: "asc" },
        include: { utilityRules: true },
      },
    },
  });
  if (!property) notFound();

  const now = new Date();
  const defaultMonth = now.getMonth() + 1;
  const defaultYear = now.getFullYear();
  const years = yearOptions(defaultYear);

  const previewImport = previewUtilityBillsImportAction.bind(null, propertyId);
  const importXlsx = importUtilityBillsXlsxAction.bind(null, propertyId);
  const addBill = addUtilityBillDatabaseAction.bind(null, propertyId);

  const errorMsg =
    query.error === "no_file"
      ? "Choose an .xlsx file to upload."
      : query.error === "file_too_large"
        ? "Spreadsheet must be 10 MB or smaller."
        : query.error === "confirm_required"
          ? "Confirm the import before saving."
          : query.error === "month_year"
            ? "Select a valid bill month and year."
            : query.error
              ? decodeURIComponent(query.error)
              : null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageBackNav
        parent={{
          href: `/properties/${propertyId}/utility-bills`,
          label: "Utility bills",
        }}
      />
      <div>
        <h1 className="text-2xl font-bold">Import bill amounts</h1>
        <p className="text-muted">
          {property.name} — store monthly utility amounts for the whole property. Amounts are split
          across units using each unit&apos;s utility rules when you generate statements.
        </p>
      </div>

      {query.imported && (
        <FlashAlert clearParams={["imported"]}>
          Replaced bill database with {query.imported} row(s) from the file. Amounts were split
          across all units using each unit&apos;s utility rules.
        </FlashAlert>
      )}
      {query.added && (
        <FlashAlert clearParams={["added"]}>
          Bill saved to the database and split across all units using each unit&apos;s utility
          rules.
        </FlashAlert>
      )}
      {errorMsg && (
        <FlashAlert variant="error" clearParams={["error"]}>
          {errorMsg}
        </FlashAlert>
      )}

      {property.units.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>How bills apply to units</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Uploads are property-wide. After import, each bill is divided across every unit that
              has utility rules configured for that utility type.
            </p>
            <ul className="space-y-2">
              {property.units.map((unit) => {
                const payingRules = unit.utilityRules.filter(
                  (rule) => rule.tenantPays && !rule.includedInRent && rule.percentage > 0
                );
                return (
                  <li key={unit.id} className="rounded-lg border border-border px-3 py-2">
                    <span className="font-medium text-foreground">{unit.name}</span>
                    {payingRules.length === 0 ? (
                      <span className="block text-warning">
                        No tenant-pays utility rules — this unit will not receive utility charges.
                      </span>
                    ) : (
                      <span className="block">
                        {payingRules
                          .map((rule) => `${rule.utilityType} ${rule.percentage}%`)
                          .join(" · ")}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload spreadsheet (.xlsx)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted">
            Supports Enbridge gas exports (<strong>Date</strong> + <strong>Payment Amount</strong>),
            Alectra-style bill history (<strong>Bill Date</strong> + <strong>Bill Amount</strong>),
            and billing tables (<strong>Due Date</strong> + <strong>Amount</strong>). Classic{" "}
            <strong>Month</strong> / <strong>Year</strong> / <strong>Amount</strong> columns work
            too. Uploading replaces all spreadsheet bills for the selected utility type.
          </p>
          <UtilityBillsImportForm
            previewAction={previewImport}
            importAction={importXlsx}
            defaultMonth={defaultMonth}
            defaultYear={defaultYear}
            years={years}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add one bill manually</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addBill} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-utilityType">Utility type</Label>
              <Select id="manual-utilityType" name="utilityType" defaultValue="gas" required>
                {SPREADSHEET_UTILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manual-billMonth">Bill month</Label>
                <Select
                  id="manual-billMonth"
                  name="billMonth"
                  defaultValue={String(defaultMonth)}
                  required
                >
                  {MONTH_NAMES.map((name, index) => (
                    <option key={name} value={String(index + 1)}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-billYear">Bill year</Label>
                <Select
                  id="manual-billYear"
                  name="billYear"
                  defaultValue={String(defaultYear)}
                  required
                >
                  {years.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Total amount</Label>
              <Input id="amount" name="amount" placeholder="e.g. 125.50" required />
            </div>
            <SubmitButton pendingLabel="Saving…">Save to database</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted">
        <Link href={`/properties/${propertyId}/utility-bills`} className="underline">
          View all bills
        </Link>
        {" · "}
        <Link href="/statements/generate" className="underline">
          Generate statements
        </Link>
      </p>
    </div>
  );
}
