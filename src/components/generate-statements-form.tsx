"use client";

import { useMemo, useState } from "react";
import { MONTH_NAMES } from "@/lib/billing-constants";
import { Label, Select } from "@/components/ui";
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

  const selectedUnits = units.filter((unit) => selectedUnitIds.has(unit.id) && unit.tenantName);

  return (
    <form action={action} className="space-y-4">
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
          <Select id="month" name="month" defaultValue={String(defaultMonth)}>
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={String(index + 1)}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Select id="year" name="year" defaultValue={String(defaultYear)}>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
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

      <SubmitButton disabled={selectedUnits.length === 0} pendingLabel="Generating…">
        Generate draft statement{selectedUnits.length === 1 ? "" : "s"}
      </SubmitButton>
    </form>
  );
}
