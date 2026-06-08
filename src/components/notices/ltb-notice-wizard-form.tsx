"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LtbNoticeWizardField } from "@/lib/ltb-notice-wizard";
import { getLtbNoticeWizardFields } from "@/lib/ltb-notice-wizard";
import { formatMoney } from "@/lib/money";
import { SubmitButton } from "@/components/submit-button";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";

export type LtbWizardProperty = {
  id: string;
  name: string;
  addressLine1: string;
  city: string;
  units: { id: string; name: string; rentAmountCents: number }[];
};

export type LtbWizardTenant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  unitId: string;
  propertyId: string;
  propertyName: string;
  unitName: string;
  rentAmountCents: number;
  leaseEndDate: string | null;
  unpaidRentCents: number;
};

export type LtbWizardForm = {
  code: string;
  name: string;
  description: string;
  downloadUrl: string;
};

type LtbNoticeWizardFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  forms: LtbWizardForm[];
  properties: LtbWizardProperty[];
  tenants: LtbWizardTenant[];
  defaultFormCode?: string;
  defaultPropertyId?: string;
  defaultUnitId?: string;
  defaultTenantId?: string;
};

const STEPS = ["Form", "Tenant", "Details", "Review"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildFieldDefaults(
  fields: LtbNoticeWizardField[],
  tenant: LtbWizardTenant | null
): Record<string, string> {
  if (!tenant) return {};
  const defaults: Record<string, string> = { serviceDate: todayIso() };
  for (const field of fields) {
    if (field.defaultFrom === "rentAmount") {
      const cents =
        field.name === "totalRentOwed" && tenant.unpaidRentCents > 0
          ? tenant.unpaidRentCents
          : tenant.rentAmountCents;
      defaults[field.name] = (cents / 100).toFixed(2);
    } else if (field.defaultFrom === "leaseEndDate" && tenant.leaseEndDate) {
      defaults[field.name] = tenant.leaseEndDate;
    } else if (field.defaultFrom === "today") {
      defaults[field.name] = todayIso();
    }
  }
  return defaults;
}

function FieldInput({
  field,
  value,
  onChange,
  hidden,
}: {
  field: LtbNoticeWizardField;
  value: string;
  onChange: (value: string) => void;
  hidden?: boolean;
}) {
  const className = hidden ? "hidden" : undefined;

  if (field.type === "textarea") {
    return (
      <Textarea
        id={field.name}
        rows={3}
        required={field.required && !hidden}
        placeholder={field.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
        tabIndex={hidden ? -1 : undefined}
      />
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <Select
        id={field.name}
        required={field.required && !hidden}
        value={value || field.options[0]?.value || ""}
        onChange={(event) => onChange(event.target.value)}
        className={className}
        tabIndex={hidden ? -1 : undefined}
      >
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }

  return (
    <Input
      id={field.name}
      type={field.type === "money" ? "number" : field.type}
      step={field.type === "money" ? "0.01" : undefined}
      min={field.type === "money" ? "0" : undefined}
      required={field.required && !hidden}
      placeholder={field.placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={className}
      tabIndex={hidden ? -1 : undefined}
    />
  );
}

export function LtbNoticeWizardForm({
  action,
  forms,
  properties,
  tenants,
  defaultFormCode = "N4",
  defaultPropertyId,
  defaultUnitId,
  defaultTenantId,
}: LtbNoticeWizardFormProps) {
  const [step, setStep] = useState(0);
  const [formCode, setFormCode] = useState(defaultFormCode);
  const [propertyId, setPropertyId] = useState(
    defaultPropertyId || properties[0]?.id || ""
  );
  const [unitId, setUnitId] = useState(defaultUnitId || "");
  const [tenantId, setTenantId] = useState(defaultTenantId || "");
  const [notes, setNotes] = useState("");

  const selectedForm = forms.find((form) => form.code === formCode) ?? forms[0];
  const wizardFields = useMemo(() => getLtbNoticeWizardFields(formCode), [formCode]);

  const propertyUnits = properties.find((property) => property.id === propertyId)?.units ?? [];
  const filteredTenants = tenants.filter((tenant) => {
    if (propertyId && tenant.propertyId !== propertyId) return false;
    if (unitId && tenant.unitId !== unitId) return false;
    return true;
  });

  const selectedTenant =
    filteredTenants.find((tenant) => tenant.id === tenantId) ??
    filteredTenants[0] ??
    null;

  const fieldDefaults = useMemo(
    () => buildFieldDefaults(wizardFields, selectedTenant),
    [wizardFields, selectedTenant]
  );

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setFieldValues((current) => {
      const next = { ...fieldDefaults };
      for (const field of wizardFields) {
        if (current[field.name]) next[field.name] = current[field.name];
      }
      return next;
    });
  }, [fieldDefaults, wizardFields]);

  function updateField(name: string, value: string) {
    setFieldValues((current) => ({ ...current, [name]: value }));
  }

  function handlePropertyChange(nextPropertyId: string) {
    setPropertyId(nextPropertyId);
    setUnitId("");
    setTenantId("");
  }

  function handleUnitChange(nextUnitId: string) {
    setUnitId(nextUnitId);
    const match = tenants.find(
      (tenant) =>
        tenant.unitId === nextUnitId &&
        (!propertyId || tenant.propertyId === propertyId)
    );
    setTenantId(match?.id ?? "");
  }

  const canContinue =
    step === 0
      ? Boolean(formCode)
      : step === 1
        ? Boolean(propertyId && unitId && selectedTenant)
        : step === 2
          ? wizardFields
              .filter((field) => field.required)
              .every((field) => fieldValues[field.name]?.trim())
          : true;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="formCode" value={formCode} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="unitId" value={unitId} />
      <input type="hidden" name="tenantId" value={selectedTenant?.id ?? ""} />

      {wizardFields.map((field) => (
        <input
          key={field.name}
          type="hidden"
          name={field.name}
          value={fieldValues[field.name] ?? ""}
        />
      ))}
      <input type="hidden" name="notes" value={notes} />

      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              index === step
                ? "bg-primary text-white"
                : index < step
                  ? "bg-primary-muted text-primary"
                  : "bg-surface-muted text-muted"
            }`}
          >
            {index + 1}. {label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose LTB form</CardTitle>
            <CardDescription>
              Select the official Ontario Landlord and Tenant Board notice you need to prepare.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wizardFormCode">Form</Label>
              <Select
                id="wizardFormCode"
                value={formCode}
                onChange={(event) => setFormCode(event.target.value)}
              >
                {forms.map((form) => (
                  <option key={form.code} value={form.code}>
                    {form.code} — {form.name}
                  </option>
                ))}
              </Select>
            </div>
            {selectedForm && (
              <Alert variant="info">
                <p className="font-medium">{selectedForm.name}</p>
                <p className="mt-1 text-sm">{selectedForm.description}</p>
                <p className="mt-2 text-sm">
                  Official blank PDF:{" "}
                  <a
                    href={selectedForm.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Download {selectedForm.code}.pdf
                  </a>
                </p>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Tenant & rental unit</CardTitle>
            <CardDescription>
              Pre-fills landlord and tenant details from your property records.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wizardPropertyId">Property</Label>
              <Select
                id="wizardPropertyId"
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
            <div className="space-y-2">
              <Label htmlFor="wizardUnitId">Unit</Label>
              <Select
                id="wizardUnitId"
                value={unitId}
                onChange={(event) => handleUnitChange(event.target.value)}
                required
              >
                <option value="">Select unit</option>
                {propertyUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="wizardTenantId">Tenant</Label>
              <Select
                id="wizardTenantId"
                value={selectedTenant?.id ?? ""}
                onChange={(event) => setTenantId(event.target.value)}
                required
              >
                <option value="">Select tenant</option>
                {filteredTenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.firstName} {tenant.lastName} — {tenant.propertyName} / {tenant.unitName}
                  </option>
                ))}
              </Select>
            </div>
            {selectedTenant && (
              <div className="md:col-span-2 rounded-xl border border-border bg-surface-muted/50 p-4 text-sm">
                <p>
                  <span className="text-muted">Rent:</span>{" "}
                  {formatMoney(selectedTenant.rentAmountCents)} / month
                </p>
                {selectedTenant.unpaidRentCents > 0 && (
                  <p>
                    <span className="text-muted">Unpaid on statements:</span>{" "}
                    {formatMoney(selectedTenant.unpaidRentCents)}
                  </p>
                )}
                {selectedTenant.leaseEndDate && (
                  <p>
                    <span className="text-muted">Lease ends:</span> {selectedTenant.leaseEndDate}
                  </p>
                )}
              </div>
            )}
            {filteredTenants.length === 0 && (
              <Alert variant="warning" className="md:col-span-2">
                Add an active tenant to a unit before generating a notice.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Notice details</CardTitle>
            <CardDescription>
              Fields match the official {formCode} form. Amounts and dates are pre-filled where
              possible.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {wizardFields.map((field) => (
              <div
                key={field.name}
                className={`space-y-2 ${field.type === "textarea" ? "md:col-span-2" : ""}`}
              >
                <Label htmlFor={field.name}>{field.label}</Label>
                <FieldInput
                  field={field}
                  value={fieldValues[field.name] ?? ""}
                  onChange={(value) => updateField(field.name, value)}
                />
                {field.helpText && <p className="text-xs text-muted">{field.helpText}</p>}
              </div>
            ))}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Internal notes (optional)</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="For your records only"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && selectedTenant && selectedForm && (
        <Card>
          <CardHeader>
            <CardTitle>Review & generate</CardTitle>
            <CardDescription>
              Generates a draft PDF aligned with Form {formCode}. Review against the official LTB
              PDF before serving.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-muted">Form:</span> {selectedForm.code} — {selectedForm.name}
            </p>
            <p>
              <span className="text-muted">Tenant:</span> {selectedTenant.firstName}{" "}
              {selectedTenant.lastName}
            </p>
            <p>
              <span className="text-muted">Unit:</span> {selectedTenant.propertyName} /{" "}
              {selectedTenant.unitName}
            </p>
            <Alert variant="info">
              The generated PDF is saved to your notices library. You can email it to the tenant or
              transfer the details into the official fillable PDF from the LTB website.
            </Alert>
            <SubmitButton pendingLabel="Generating PDF…">Generate notice PDF</SubmitButton>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        {step < STEPS.length - 1 && (
          <Button
            type="button"
            disabled={!canContinue}
            onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
