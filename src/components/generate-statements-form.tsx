"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { getUtilityBillsForMonthAction } from "@/app/actions/statements";
import { MONTH_NAMES, UTILITY_TYPE_LABELS } from "@/lib/billing-constants";
import { formatMoney } from "@/lib/money";
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
  const [extraCosts, setExtraCosts] = useState<ExtraCostRow[]>([]);
  const [nextExtraId, setNextExtraId] = useState(0);
  const [isLoadingBills, startBillTransition] = useTransition();

  const selectedProperty = properties.find((property) => property.id === propertyId);
  const units = selectedProperty?.units ?? [];

  const defaultSelectedUnitIds = useMemo(() => {
    if (!selectedProperty) return new Set<string>();
    if (defaultUnitId && selectedProperty.units.some((unit) => unit.id === defaultUnitId)) {
      return new Set([defaultUnitId]);
    }
    return new Set(
      selectedProperty.units.filter((unit) => unit.tenantName).map((unit) => unit.id)
    );
  }, [selectedProperty, defaultUnitId]);

  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(defaultSelectedUnitIds);

  useEffect(() => {
    if (!propertyId) return;
    startBillTransition(async () => {
      const bills = await getUtilityBillsForMonthAction(propertyId, month, year);
      setUtilityBills(bills);
    });
  }, [propertyId, month, year]);

  function handlePropertyChange(nextPropertyId: string) {
    setPropertyId(nextPropertyId);
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
            Each selected unit gets its own draft statement. Utility charges come from the
            property bill database, split using that unit&apos;s utility rules.
          </p>
        </div>

        {units.length === 0 ? (
          <p className="text-sm text-muted">This property has no units yet.</p>
        ) : (
          <div className="space-y-2">
            {units.map((unit) => {
              const disabled = !unit.tenantName;
              const checked = selectedUnitIds.has(unit.id);
              return (
                <label
                  key={unit.id}
                  className={`flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2 ${
                    disabled ? "opacity-60" : ""
                  }`}
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
                    <span className="font-medium text-foreground">{unit.name}</span>
                    {unit.tenantName ? (
                      <span className="block text-muted">Tenant: {unit.tenantName}</span>
                    ) : (
                      <span className="block text-amber-700">No active tenant — skipped</span>
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
              {selectedUnits.map((unit) => unit.name).join(", ")}
            </span>
            .
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-surface-muted/40 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Utility bills — gas, water, electricity (optional)</p>
          <p className="text-sm text-muted">
            Attach bill PDFs or images for this month. If a utility isn&apos;t in the bill database
            yet, enter the amount and optionally attach the bill — it will be saved and split using
            each unit&apos;s utility rules.
          </p>
        </div>

        {isLoadingBills ? (
          <p className="text-sm text-muted">Loading bills for this month…</p>
        ) : (
          <div className="space-y-3">
            {utilityBills.map((bill) => {
              const label = UTILITY_TYPE_LABELS[bill.utilityType];

              if (bill.status === "missing") {
                return (
                  <div
                    key={bill.utilityType}
                    className="rounded-lg border border-dashed border-border bg-surface px-3 py-3"
                  >
                    <div className="mb-2">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-amber-700">
                        No {label.toLowerCase()} bill for {MONTH_NAMES[month - 1]} {year} yet
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={`newBill_${bill.utilityType}_amount`} className="text-xs">
                          Amount
                        </Label>
                        <Input
                          id={`newBill_${bill.utilityType}_amount`}
                          name={`newBill_${bill.utilityType}_amount`}
                          placeholder="0.00"
                          inputMode="decimal"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`newBill_${bill.utilityType}_file`} className="text-xs">
                          Attach bill (optional)
                        </Label>
                        <Input
                          id={`newBill_${bill.utilityType}_file`}
                          name={`newBill_${bill.utilityType}_file`}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.heic,image/*,application/pdf"
                        />
                      </div>
                    </div>
                  </div>
                );
              }

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
                        <p className="text-xs text-green-700">
                          Bill on file{bill.documentFileName ? `: ${bill.documentFileName}` : ""}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-700">No bill document attached yet</p>
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
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-surface-muted/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Other costs (optional)</p>
            <p className="text-sm text-muted">
              Add parking, repairs, one-off fees, or any extra charge. Each cost is added to every
              selected unit&apos;s statement. Attach a receipt or bill if you have one.
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
                    className="text-red-700 hover:bg-red-50 hover:text-red-800"
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

      <SubmitButton disabled={selectedUnits.length === 0} pendingLabel="Generating…">
        Generate draft statement{selectedUnits.length === 1 ? "" : "s"}
      </SubmitButton>
    </form>
  );
}
