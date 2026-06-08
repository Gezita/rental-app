import type { LtbForm } from "./ltb-forms";
import { getLtbForm } from "./ltb-forms";

export type LtbNoticeWizardFieldType = "text" | "date" | "money" | "textarea" | "select";

export type LtbNoticeWizardField = {
  name: string;
  label: string;
  type: LtbNoticeWizardFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  defaultFrom?: "rentAmount" | "leaseEndDate" | "today";
};

export type LtbNoticeWizardInput = {
  formCode: string;
  formName: string;
  landlordName: string;
  landlordEmail?: string;
  landlordPhone?: string;
  landlordAddress?: string;
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  propertyName: string;
  propertyAddress: string;
  unitName: string;
  serviceDate: Date;
  effectiveDate?: Date;
  terminationDate?: Date;
  fieldValues: Record<string, string>;
  notes?: string;
};

const COMMON_FIELDS: LtbNoticeWizardField[] = [
  {
    name: "serviceDate",
    label: "Date notice will be given to tenant",
    type: "date",
    required: true,
    defaultFrom: "today",
  },
];

const FORM_FIELDS: Record<string, LtbNoticeWizardField[]> = {
  N4: [
    ...COMMON_FIELDS,
    {
      name: "rentPeriodFrom",
      label: "Rent owed — period from",
      type: "date",
      required: true,
    },
    {
      name: "rentPeriodTo",
      label: "Rent owed — period to",
      type: "date",
      required: true,
    },
    {
      name: "totalRentOwed",
      label: "Total rent owed ($)",
      type: "money",
      required: true,
      defaultFrom: "rentAmount",
      helpText: "Total unpaid rent claimed on the notice.",
    },
    {
      name: "terminationDate",
      label: "Termination date",
      type: "date",
      required: true,
      helpText: "Earliest date tenancy may end if rent is not paid.",
    },
  ],
  N1: [
    ...COMMON_FIELDS,
    {
      name: "currentRent",
      label: "Current lawful rent ($/month)",
      type: "money",
      required: true,
      defaultFrom: "rentAmount",
    },
    {
      name: "newRent",
      label: "New rent ($/month)",
      type: "money",
      required: true,
    },
    {
      name: "effectiveDate",
      label: "Rent increase effective date",
      type: "date",
      required: true,
      helpText: "Must comply with RTA notice periods (typically 90 days for most units).",
    },
  ],
  N8: [
    ...COMMON_FIELDS,
    {
      name: "terminationDate",
      label: "Termination date (end of term)",
      type: "date",
      required: true,
      defaultFrom: "leaseEndDate",
    },
    {
      name: "reason",
      label: "Reason / notes (optional)",
      type: "textarea",
      placeholder: "e.g. Fixed term ending, no renewal offered",
    },
  ],
  N12: [
    ...COMMON_FIELDS,
    {
      name: "terminationDate",
      label: "Termination date",
      type: "date",
      required: true,
    },
    {
      name: "requiredBy",
      label: "Who requires the unit",
      type: "select",
      required: true,
      options: [
        { value: "landlord", label: "Landlord" },
        { value: "purchaser", label: "Purchaser" },
        { value: "family", label: "Landlord's family member" },
      ],
    },
    {
      name: "personName",
      label: "Name of person who requires the unit",
      type: "text",
      required: true,
    },
  ],
};

const GENERIC_FIELDS: LtbNoticeWizardField[] = [
  ...COMMON_FIELDS,
  {
    name: "terminationDate",
    label: "Effective / termination date",
    type: "date",
    required: true,
  },
  {
    name: "details",
    label: "Notice details",
    type: "textarea",
    required: true,
    placeholder: "Summarize the grounds and key dates for this notice.",
  },
];

export function getLtbNoticeWizardFields(formCode: string): LtbNoticeWizardField[] {
  return FORM_FIELDS[formCode.toUpperCase()] ?? GENERIC_FIELDS;
}

export function getSupportedWizardFormCodes(): string[] {
  return Object.keys(FORM_FIELDS);
}

export function resolveLtbNoticeForm(formCode: string): LtbForm | undefined {
  return getLtbForm(formCode);
}

export function formatLtbFieldValue(field: LtbNoticeWizardField, value: string): string {
  if (!value) return "—";
  if (field.type === "money") {
    const num = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(num)) {
      return new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
      }).format(num);
    }
  }
  if (field.type === "date") {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  }
  if (field.type === "select" && field.options) {
    return field.options.find((option) => option.value === value)?.label ?? value;
  }
  return value;
}

export function buildLtbNoticeFieldLines(
  formCode: string,
  fieldValues: Record<string, string>
): string[] {
  const fields = getLtbNoticeWizardFields(formCode);
  return fields
    .filter((field) => field.name !== "serviceDate")
    .map((field) => {
      const value = fieldValues[field.name];
      if (!value?.trim()) return null;
      return `${field.label}: ${formatLtbFieldValue(field, value)}`;
    })
    .filter((line): line is string => Boolean(line));
}
