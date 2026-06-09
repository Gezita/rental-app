"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  getMissingUtilityBillsWarningsAction,
  getUtilityBillsForMonthAction,
  previewStatementsAction,
  type MissingUtilityBillsWarning,
} from "@/app/actions/statements";
import type { StatementPreviewRow } from "@/lib/statement-preview";
import { StatementPreviewTable } from "@/components/statement-preview-table";
import { MONTH_NAMES, UTILITY_TYPE_LABELS } from "@/lib/billing-constants";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Label, Select, Button, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export type GeneratePropertyOption = {
  id: string;
  name: string;
  units: {
    id: string;
    name: string;
    tenantName: string | null;
  }[];
};

type UtilityBillOption = Awaited<ReturnType<typeof getUtilityBillsForMonthAction>>[number];

type ExtraCostRow = {
  id: number;
};

type GenerateStatementsFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  properties: GeneratePropertyOption[];
  defaultPropertyId?: string;
  defaultUnitId?: string;
  defaultMonth: number;
  defaultYear: number;
  years: number[];
};

const ALL_PROPERTIES_VALUE = "all";

export function GenerateStatementsForm({
  action,
  properties,
  defaultPropertyId,
  defaultUnitId,
  defaultMonth,
  defaultYear,
  years,
}: GenerateStatementsFormProps) {
  const initialPropertyId = defaultPropertyId || properties[0]?.id || "";
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [utilityBills, setUtilityBills] = useState<UtilityBillOption[]>([]);
  const [missingBillWarnings, setMissingBillWarnings] = useState<MissingUtilityBillsWarning[]>(
    []
  );
  const [extraCosts, setExtraCosts] = useState<ExtraCostRow[]>([]);
  const [nextExtraId, setNextExtraId] = useState(0);
  const [isLoadingBills, startBillTransition] = useTransition();
  const [previewRows, setPreviewRows] = useState<StatementPreviewRow[]>([]);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [isPreviewing, startPreview] = useTransition();

  const isAllProperties = propertyId === ALL_PROPERTIES_VALUE;

  const selectedProperty = isAllProperties
    ? undefined
    : properties.find((property) => property.id === propertyId);

  const units = isAllProperties
    ? properties.flatMap((property) =>
        property.units.map((unit) => ({
          ...unit,
          propertyName: property.name,
        }))
      )
    : (selectedProperty?.units ?? []).map((unit) => ({
        ...unit,
        propertyName: selectedProperty?.name ?? "",
      }));

  const defaultSelectedUnitIds = useMemo(() => {
    if (defaultUnitId && units.some((unit) => unit.id === defaultUnitId)) {
      return new Set([defaultUnitId]);
    }
    return new Set(units.filter((unit) => unit.tenantName).map((unit) => unit.id));
  }, [units, defaultUnitId]);

  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(defaultSelectedUnitIds);

  useEffect(() => {
    if (!propertyId) return;
    setPreviewLoaded(false);
    setPreviewRows([]);
    startBillTransition(async () => {
      const [bills, warnings] = await Promise.all([
        isAllProperties
          ? Promise.resolve([])
          : getUtilityBillsForMonthAction(propertyId, month, year),
        getMissingUtilityBillsWarningsAction(propertyId, month, year),
      ]);
      setUtilityBills(bills);
      setMissingBillWarnings(warnings);
    });
  }, [propertyId, month, year, isAllProperties]);

  function handlePreview() {
    const unitIds = [...selectedUnitIds];
    if (unitIds.length === 0) return;
    startPreview(async () => {
      const rows = await previewStatementsAction(propertyId, month, year, unitIds);
      setPreviewRows(rows);
      setPreviewLoaded(true);
    });
  }

  function handlePropertyChange(nextPropertyId: string) {
    setPropertyId(nextPropertyId);
    if (nextPropertyId === ALL_PROPERTIES_VALUE) {
      setSelectedUnitIds(
        new Set(
          properties.flatMap((property) =>
            property.units.filter((unit) => unit.tenantName).map((unit) => unit.id)
          )
        )
      );
      return;
    }

    const property = properties.find((item) => item.id === nextPropertyId);
    setSelectedUnitIds(
      new Set(property?.units.filter((unit) => unit.tenantName).map((unit) => unit.id) ?? [])
    );
  }

  function toggleUnit(unitId: string, checked: boolean) {
    setSelectedUnitIds((current) => {
      const next = new Set(current);
      if (checked) next.add(unitId);
      else next.delete(unitId);
      return next;
    });
  }

  function addExtraCost() {
    setExtraCosts((rows) => [...rows, { id: nextExtraId }]);
    setNextExtraId((id) => id + 1);
  }

  function removeExtraCost(id: number) {
    setExtraCosts((rows) => rows.filter((row) => row.id !== id));
  }

  const selectedUnits = units.filter((unit) => selectedUnitIds.has(unit.id) && unit.tenantName);
  const existingBills = utilityBills.filter((bill) => bill.status === "existing");

  return (
    <form action={action} encType="multipart/form-data" className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="propertyId">Property</Label>
        <Select
          id="propertyId"
          name="propertyId"
          value={propertyId}
          onChange={(event) => handlePropertyChange(event.target.value)}
          required
        >
          <option value={ALL_PROPERTIES_VALUE}>All properties</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="month">Month</Label>
          <Select
            id="month"
            name="month"
            value={String(month)}
            onChange={(event) => setMonth(parseInt(event.target.value, 10))}
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
          <Label htmlFor="year">Year</Label>
          <Select
            id="year"
            name="year"
            value={String(year)}
            onChange={(event) => setYear(parseInt(event.target.value, 10))}
            required
          >
            {years.map((optionYear) => (
              <option key={optionYear} value={String(optionYear)}>
                {optionYear}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-surface-muted/40 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Units to generate</p>
          <p className="text-sm text-muted">
            Each selected unit gets its own draft statement. Utility charges come from the bill
            database when available; rent is always included.
          </p>
        </div>

        {units.length === 0 ? (
          <p className="text-sm text-muted">No units yet.</p>
        ) : (
          <div className="space-y-2">
            {units.map((unit) => {
              const disabled = !unit.tenantName;
              const checked = selectedUnitIds.has(unit.id);
              return (
                <label
                  key={unit.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2",
                    disabled && "opacity-60"
                  )}
                >
                  <input
                    type="checkbox"
                    name="unitIds"
                    value={unit.id}
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) => toggleUnit(unit.id, event.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-foreground">
                      {isAllProperties ? `${unit.propertyName} — ${unit.name}` : unit.name}
                    </span>
                    {unit.tenantName ? (
                      <span className="block text-muted">Tenant: {unit.tenantName}</span>
                    ) : (
                      <span className="block text-warning">No active tenant — skipped</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {selectedUnits.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Will create {selectedUnits.length} draft
            {selectedUnits.length === 1 ? "" : "s"} for{" "}
            <span className="font-medium text-foreground">
              {selectedUnits
                .map((unit) =>
                  isAllProperties ? `${unit.propertyName} / ${unit.name}` : unit.name
                )
                .join(", ")}
            </span>
            .
          </p>
        )}
      </div>

      {isLoadingBills ? (
        <p className="text-sm text-muted">Checking utility bills for this month…</p>
      ) : (
        <>
          {missingBillWarnings.length > 0 && (
            <div className="space-y-3 rounded-lg border border-warning/25 bg-warning-muted/30 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Missing utility bills</p>
                <p className="text-sm text-muted">
                  You can still generate drafts now — rent and prior balances will be included.
                  Utility line items are added only when bill amounts exist for{" "}
                  {MONTH_NAMES[month - 1]} {year}. Add bills later and refresh each statement.
                </p>
              </div>
              <ul className="space-y-2 text-sm">
                {missingBillWarnings.map((warning) => (
                  <li key={warning.propertyId} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-foreground">{warning.propertyName}:</span>
                    <span className="text-muted">{warning.missingLabels.join(", ")}</span>
                    <Link
                      href={`/properties/${warning.propertyId}/utility-bills/import`}
                      className="font-medium text-primary-hover underline underline-offset-2"
                    >
                      Add bills
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">
                Or open the{" "}
                <Link href="/billing/utility-bills" className="font-medium text-primary-hover underline">
                  utility bills hub
                </Link>{" "}
                to import or upload for any property.
              </p>
            </div>
          )}

          {!isAllProperties && existingBills.length > 0 && (
            <div className="space-y-3 rounded-lg border border-border bg-surface-muted/40 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Bills on file this month</p>
                <p className="text-sm text-muted">
                  Amounts below will be split using each unit&apos;s utility rules. Attach a PDF
                  if one isn&apos;t linked yet.
                </p>
              </div>
              <div className="space-y-3">
                {existingBills.map((bill) => {
                  const label = UTILITY_TYPE_LABELS[bill.utilityType];
                  const provider = bill.providerName ? ` · ${bill.providerName}` : "";

                  return (
                    <div
                      key={bill.id}
                      className="rounded-lg border border-border bg-surface px-3 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {label}
                            {provider}
                          </p>
                          <p className="text-sm text-muted">{formatMoney(bill.amountCents)}</p>
                          {bill.hasDocument ? (
                            <p className="text-xs text-success">
                              Bill on file{bill.documentFileName ? `: ${bill.documentFileName}` : ""}
                            </p>
                          ) : (
                            <p className="text-xs text-warning">No bill document attached yet</p>
                          )}
                        </div>
                        <div className="min-w-[12rem] flex-1 space-y-1 sm:max-w-xs">
                          <Label htmlFor={`billFile_${bill.id}`} className="text-xs">
                            {bill.hasDocument ? "Replace attachment" : "Attach bill"}
                          </Label>
                          <Input
                            id={`billFile_${bill.id}`}
                            name={`billFile_${bill.id}`}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.heic,image/*,application/pdf"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {!isAllProperties && (
        <div className="space-y-3 rounded-lg border border-border bg-surface-muted/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Other costs (optional)</p>
              <p className="text-sm text-muted">
                Add parking, repairs, one-off fees, or any extra charge. Each cost is added to
                every selected unit&apos;s statement. Attach a receipt or bill if you have one.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addExtraCost}>
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Add cost
            </Button>
          </div>

          {extraCosts.length === 0 ? (
            <p className="text-sm text-muted">No extra costs added.</p>
          ) : (
            <div className="space-y-3">
              {extraCosts.map((row) => (
                <div
                  key={row.id}
                  className="grid gap-3 rounded-lg border border-border bg-surface p-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end"
                >
                  <div className="space-y-2 sm:col-span-3 sm:grid sm:grid-cols-[1fr_8rem_1fr_auto] sm:items-end sm:gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`extraCost_${row.id}_description`}>Description</Label>
                      <Input
                        id={`extraCost_${row.id}_description`}
                        name={`extraCost_${row.id}_description`}
                        placeholder="e.g. Parking, key replacement"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`extraCost_${row.id}_amount`}>Amount</Label>
                      <Input
                        id={`extraCost_${row.id}_amount`}
                        name={`extraCost_${row.id}_amount`}
                        placeholder="0.00"
                        inputMode="decimal"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`extraCost_${row.id}_file`}>Attachment (optional)</Label>
                      <Input
                        id={`extraCost_${row.id}_file`}
                        name={`extraCost_${row.id}_file`}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.heic,image/*,application/pdf"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger-muted hover:text-danger"
                      onClick={() => removeExtraCost(row.id)}
                      aria-label="Remove extra cost"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={selectedUnits.length === 0 || isPreviewing}
          onClick={handlePreview}
        >
          {isPreviewing ? "Previewing…" : "Preview statements"}
        </Button>
        <SubmitButton disabled={selectedUnits.length === 0} pendingLabel="Generating…">
          Generate draft statement{selectedUnits.length === 1 ? "" : "s"}
        </SubmitButton>
      </div>

      {previewLoaded && (
        <div className="space-y-3 rounded-lg border border-border bg-surface-muted/40 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Statement preview</p>
            <p className="text-sm text-muted">
              Review totals before generating drafts for {MONTH_NAMES[month - 1]} {year}.
            </p>
          </div>
          <StatementPreviewTable rows={previewRows} />
        </div>
      )}
    </form>
  );
}
