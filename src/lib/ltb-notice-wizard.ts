import type { LtbForm } from "./ltb-forms";
import { getLtbForm } from "./ltb-forms";
import { formatMoney, parseMoneyToCents } from "./money";

export type LtbNoticeWizardFieldType = "text" | "date" | "money" | "textarea" | "select";

export type LtbNoticeWizardField = {
  name: string;
  label: string;
  type: LtbNoticeWizardFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  defaultFrom?:
    | "rentAmount"
    | "leaseEndDate"
    | "today"
    | "landlordName"
    | "landlordEmail"
    | "propertyAddress";
  /** Grouping heading rendered above this field in the wizard. */
  section?: string;
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
    {
      name: "serviceDate",
      label: "Date you complete this notice",
      type: "date",
      required: true,
      defaultFrom: "today",
      section: "Notice dates",
    },
    {
      name: "terminationDate",
      label: "Termination date (deadline to pay or move out)",
      type: "date",
      required: true,
      section: "Notice dates",
      helpText:
        "The earliest date the tenancy can end. Give at least 14 days for monthly/yearly tenancies (7 days for daily or weekly).",
    },
    {
      name: "rentPeriod1From",
      label: "Period 1 — from",
      type: "date",
      required: true,
      section: "Rent you are owed",
    },
    {
      name: "rentPeriod1To",
      label: "Period 1 — to",
      type: "date",
      required: true,
      section: "Rent you are owed",
    },
    {
      name: "rentPeriod1Charged",
      label: "Period 1 — rent charged ($)",
      type: "money",
      required: true,
      defaultFrom: "rentAmount",
      section: "Rent you are owed",
    },
    {
      name: "rentPeriod1Paid",
      label: "Period 1 — rent paid ($)",
      type: "money",
      required: true,
      section: "Rent you are owed",
      helpText: "Amount the tenant has paid toward this period (enter 0 if none).",
    },
    {
      name: "rentPeriod2From",
      label: "Period 2 — from (optional)",
      type: "date",
      section: "Additional rent periods",
    },
    {
      name: "rentPeriod2To",
      label: "Period 2 — to",
      type: "date",
      section: "Additional rent periods",
    },
    {
      name: "rentPeriod2Charged",
      label: "Period 2 — rent charged ($)",
      type: "money",
      section: "Additional rent periods",
    },
    {
      name: "rentPeriod2Paid",
      label: "Period 2 — rent paid ($)",
      type: "money",
      section: "Additional rent periods",
    },
    {
      name: "rentPeriod3From",
      label: "Period 3 — from (optional)",
      type: "date",
      section: "Additional rent periods",
    },
    {
      name: "rentPeriod3To",
      label: "Period 3 — to",
      type: "date",
      section: "Additional rent periods",
    },
    {
      name: "rentPeriod3Charged",
      label: "Period 3 — rent charged ($)",
      type: "money",
      section: "Additional rent periods",
    },
    {
      name: "rentPeriod3Paid",
      label: "Period 3 — rent paid ($)",
      type: "money",
      section: "Additional rent periods",
    },
    {
      name: "signerName",
      label: "Name of person signing",
      type: "text",
      required: true,
      defaultFrom: "landlordName",
      section: "Signature",
    },
    {
      name: "signerRole",
      label: "Signing as",
      type: "select",
      required: true,
      section: "Signature",
      options: [
        { value: "landlord", label: "Landlord" },
        { value: "representative", label: "Representative / agent" },
      ],
    },
    {
      name: "signerPhone",
      label: "Phone number",
      type: "text",
      required: true,
      section: "Signature",
    },
    {
      name: "serviceAddress",
      label: "Address for service",
      type: "textarea",
      required: true,
      defaultFrom: "propertyAddress",
      section: "Address for service",
      helpText: "Where the tenant can deliver documents or payment to you.",
    },
    {
      name: "serviceEmail",
      label: "Email (optional)",
      type: "text",
      defaultFrom: "landlordEmail",
      section: "Address for service",
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

export type N4RentRow = {
  from: string;
  to: string;
  chargedCents: number;
  paidCents: number;
  owingCents: number;
};

/**
 * Parses the N4 rent-period rows from wizard field values and computes the
 * total amount owing. Rows without a "from" date are ignored.
 */
export function computeN4RentOwing(fieldValues: Record<string, string>): {
  rows: N4RentRow[];
  totalOwingCents: number;
} {
  const rows: N4RentRow[] = [];
  for (const i of [1, 2, 3]) {
    const from = fieldValues[`rentPeriod${i}From`]?.trim();
    const to = fieldValues[`rentPeriod${i}To`]?.trim();
    const charged = fieldValues[`rentPeriod${i}Charged`]?.trim();
    if (!from || !charged) continue;
    const chargedCents = parseMoneyToCents(charged);
    const paidCents = parseMoneyToCents(fieldValues[`rentPeriod${i}Paid`] ?? "0");
    rows.push({
      from,
      to: to ?? "",
      chargedCents,
      paidCents,
      owingCents: Math.max(0, chargedCents - paidCents),
    });
  }
  const totalOwingCents = rows.reduce((sum, row) => sum + row.owingCents, 0);
  return { rows, totalOwingCents };
}

/** Display total rent owing for an N4 (e.g. "$1,500.00"). */
export function formatN4Total(fieldValues: Record<string, string>): string {
  return formatMoney(computeN4RentOwing(fieldValues).totalOwingCents);
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
