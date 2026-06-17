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
    | "propertyAddress"
    | "tenantName";
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

const signerFields = (section = "Signature"): LtbNoticeWizardField[] => [
  {
    name: "signerName",
    label: "Name of person signing",
    type: "text",
    required: true,
    defaultFrom: "landlordName",
    section,
  },
  {
    name: "signerRole",
    label: "Signing as",
    type: "select",
    required: true,
    section,
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
    section,
  },
];

const serviceAddressFields = (section = "Address for service"): LtbNoticeWizardField[] => [
  {
    name: "serviceAddress",
    label: "Address for service",
    type: "textarea",
    required: true,
    defaultFrom: "propertyAddress",
    section,
    helpText: "Where documents, notices, or payments can be delivered.",
  },
  {
    name: "serviceEmail",
    label: "Email (optional)",
    type: "text",
    defaultFrom: "landlordEmail",
    section,
  },
];

const serviceDateField = (label = "Date notice will be given"): LtbNoticeWizardField => ({
  name: "serviceDate",
  label,
  type: "date",
  required: true,
  defaultFrom: "today",
  section: "Notice dates",
});

const terminationDateField = (label = "Termination date"): LtbNoticeWizardField => ({
  name: "terminationDate",
  label,
  type: "date",
  required: true,
  section: "Notice dates",
});

const rentIncreaseFields: LtbNoticeWizardField[] = [
  serviceDateField("Date notice will be given to tenant"),
  {
    name: "effectiveDate",
    label: "Rent increase effective date",
    type: "date",
    required: true,
    section: "Rent increase",
    helpText: "For most rent increases, the LTB form requires at least 90 days notice.",
  },
  {
    name: "currentRent",
    label: "Current lawful rent ($)",
    type: "money",
    required: true,
    defaultFrom: "rentAmount",
    section: "Rent increase",
  },
  {
    name: "newRent",
    label: "New rent ($)",
    type: "money",
    required: true,
    section: "Rent increase",
  },
  {
    name: "rentFrequency",
    label: "Rent frequency",
    type: "select",
    required: true,
    section: "Rent increase",
    options: [
      { value: "month", label: "per month" },
      { value: "week", label: "per week" },
      { value: "other", label: "other" },
    ],
  },
];

const FORM_FIELDS: Record<string, LtbNoticeWizardField[]> = {
  N1: [
    ...rentIncreaseFields,
    {
      name: "increaseExplanation",
      label: "Explanation of rent increase",
      type: "select",
      required: true,
      section: "Rent increase",
      options: [
        { value: "at_or_below_guideline", label: "At or below the guideline" },
        { value: "approved_above_guideline", label: "Above guideline already approved by LTB order" },
        { value: "applied_above_guideline", label: "Above guideline application has been filed" },
      ],
    },
    ...signerFields(),
  ],
  N2: [
    ...rentIncreaseFields,
    {
      name: "partialExemptionDetails",
      label: "Why this unit is partially exempt",
      type: "textarea",
      required: true,
      section: "Partially exempt unit",
      placeholder: "Describe the exemption basis you are relying on.",
    },
    ...signerFields(),
  ],
  N3: [
    serviceDateField("Date notice will be given to tenant"),
    {
      name: "effectiveDate",
      label: "Increase effective date",
      type: "date",
      required: true,
      section: "Care home increase",
    },
    {
      name: "currentRent",
      label: "Current rent ($)",
      type: "money",
      required: true,
      defaultFrom: "rentAmount",
      section: "Care home increase",
    },
    {
      name: "newRent",
      label: "New rent ($)",
      type: "money",
      required: true,
      section: "Care home increase",
    },
    {
      name: "careServicesAndMeals",
      label: "New care services and/or meals charge ($)",
      type: "money",
      section: "Care home increase",
    },
    {
      name: "totalMonthlyAmount",
      label: "Total rent + care services/meals after increase ($)",
      type: "money",
      section: "Care home increase",
    },
    {
      name: "approvalRequired",
      label: "Does the rent increase need LTB approval?",
      type: "select",
      required: true,
      section: "Care home increase",
      options: [
        { value: "no", label: "No approval needed" },
        { value: "yes", label: "Approval needed by LTB order" },
      ],
    },
    ...signerFields(),
  ],
  N4: [
    serviceDateField("Date you complete this notice"),
    {
      ...terminationDateField("Termination date (deadline to pay or move out)"),
      helpText:
        "The earliest date the tenancy can end. Give at least 14 days for monthly/yearly tenancies or 7 days for daily/weekly tenancies.",
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
      helpText: "Amount the tenant has paid toward this period. Enter 0 if none.",
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
    ...signerFields(),
    ...serviceAddressFields(),
  ],
  N5: [
    serviceDateField(),
    terminationDateField(),
    {
      name: "noticeSequence",
      label: "Notice sequence",
      type: "select",
      required: true,
      section: "Reason",
      options: [
        { value: "first", label: "First N5 notice" },
        { value: "second_within_6_months", label: "Second N5 within 6 months" },
      ],
    },
    {
      name: "reason",
      label: "Reason for the notice",
      type: "select",
      required: true,
      section: "Reason",
      options: [
        { value: "interference", label: "Substantial interference / reasonable enjoyment" },
        { value: "damage", label: "Damage to unit or residential complex" },
        { value: "overcrowding", label: "Overcrowding" },
      ],
    },
    {
      name: "incidentDetails",
      label: "Detailed facts, dates, and examples",
      type: "textarea",
      required: true,
      section: "Details",
      placeholder: "Include who, what happened, when, where, and how it affected others or the property.",
    },
    {
      name: "correctionRequired",
      label: "What the tenant must do to correct the problem",
      type: "textarea",
      section: "Details",
    },
    ...signerFields(),
  ],
  N6: [
    serviceDateField(),
    terminationDateField(),
    {
      name: "reason",
      label: "Reason for the notice",
      type: "select",
      required: true,
      section: "Reason",
      options: [
        { value: "illegal_drug", label: "Illegal act involving illegal drugs" },
        { value: "illegal_other", label: "Illegal act or business not involving illegal drugs" },
        { value: "rgi_income", label: "Misrepresenting income in rent-geared-to-income housing" },
      ],
    },
    {
      name: "details",
      label: "Detailed facts and dates",
      type: "textarea",
      required: true,
      section: "Details",
    },
    ...signerFields(),
  ],
  N7: [
    serviceDateField(),
    terminationDateField(),
    {
      name: "reason",
      label: "Reason for the notice",
      type: "select",
      required: true,
      section: "Reason",
      options: [
        { value: "safety", label: "Seriously impaired safety" },
        { value: "wilful_damage", label: "Wilful damage" },
        { value: "serious_damage_use", label: "Use caused or could cause serious damage" },
        { value: "small_building_interference", label: "Small building: substantial interference with landlord" },
      ],
    },
    {
      name: "details",
      label: "Detailed facts and dates",
      type: "textarea",
      required: true,
      section: "Details",
      placeholder: "Be specific. Include dates, people involved, and what made the issue serious.",
    },
    ...signerFields(),
  ],
  N8: [
    serviceDateField(),
    {
      ...terminationDateField("Termination date (end of term)"),
      defaultFrom: "leaseEndDate",
    },
    {
      name: "reason",
      label: "Reason for ending tenancy at the end of term",
      type: "select",
      required: true,
      section: "Reason",
      options: [
        { value: "persistent_late_payment", label: "Persistent late payment of rent" },
        { value: "employment_ended", label: "Employment that provided rental unit ended" },
        { value: "subsidized_no_longer_qualifies", label: "Tenant no longer qualifies for subsidized housing" },
        { value: "rehabilitative_period_ended", label: "Rehabilitative/therapeutic services tenancy ended" },
        { value: "condominium_purchase_failed", label: "Condominium purchase agreement failed" },
        { value: "other", label: "Other reason listed on official N8" },
      ],
    },
    {
      name: "details",
      label: "Details and supporting facts",
      type: "textarea",
      required: true,
      section: "Details",
    },
    ...signerFields(),
  ],
  N9: [
    serviceDateField("Date tenant gives this notice"),
    {
      ...terminationDateField("Date tenant will move out"),
      defaultFrom: "leaseEndDate",
    },
    {
      name: "tenantSigningName",
      label: "Tenant signing name",
      type: "text",
      required: true,
      defaultFrom: "tenantName",
      section: "Tenant signature",
    },
    {
      name: "tenantForwardingAddress",
      label: "Tenant forwarding address (optional)",
      type: "textarea",
      section: "Tenant details",
    },
  ],
  N10: [
    serviceDateField("Date agreement is signed"),
    {
      name: "currentRent",
      label: "Current rent ($)",
      type: "money",
      required: true,
      defaultFrom: "rentAmount",
      section: "Agreement details",
    },
    {
      name: "newRent",
      label: "New agreed rent ($)",
      type: "money",
      required: true,
      section: "Agreement details",
    },
    {
      name: "effectiveDate",
      label: "New rent effective date",
      type: "date",
      required: true,
      section: "Agreement details",
    },
    {
      name: "agreementReason",
      label: "Reason / services related to the increase",
      type: "textarea",
      required: true,
      section: "Agreement details",
      placeholder: "Describe capital work, new/additional services, or other reason for the agreed increase.",
    },
    {
      name: "tenantSigningName",
      label: "Tenant signing name",
      type: "text",
      required: true,
      defaultFrom: "tenantName",
      section: "Signatures",
    },
    ...signerFields("Signatures"),
  ],
  N11: [
    serviceDateField("Date agreement is signed"),
    {
      ...terminationDateField("Agreed tenancy end date"),
      defaultFrom: "leaseEndDate",
    },
    {
      name: "tenantSigningName",
      label: "Tenant signing name",
      type: "text",
      required: true,
      defaultFrom: "tenantName",
      section: "Signatures",
    },
    ...signerFields("Signatures"),
    {
      name: "agreementNotes",
      label: "Internal agreement notes (optional)",
      type: "textarea",
      section: "Notes",
      placeholder: "Optional context. Keep the signed form clean and factual.",
    },
  ],
  N12: [
    serviceDateField(),
    terminationDateField(),
    {
      name: "requiredBy",
      label: "Who requires the unit",
      type: "select",
      required: true,
      section: "Reason",
      options: [
        { value: "landlord", label: "Landlord" },
        { value: "landlord_family", label: "Landlord's qualifying family member" },
        { value: "caregiver", label: "Caregiver for landlord/family member" },
        { value: "purchaser", label: "Purchaser" },
        { value: "purchaser_family", label: "Purchaser's qualifying family member" },
        { value: "purchaser_caregiver", label: "Caregiver for purchaser/family member" },
      ],
    },
    {
      name: "personName",
      label: "Name of person who requires the unit",
      type: "text",
      required: true,
      section: "Reason",
    },
    {
      name: "compensationPlan",
      label: "Compensation / alternative unit plan",
      type: "textarea",
      required: true,
      section: "Compensation",
      placeholder: "e.g. One month's rent will be paid by the termination date.",
    },
    ...signerFields(),
  ],
  N13: [
    serviceDateField(),
    terminationDateField(),
    {
      name: "reason",
      label: "Reason for ending tenancy",
      type: "select",
      required: true,
      section: "Reason",
      options: [
        { value: "demolish", label: "Demolish the rental unit or residential complex" },
        { value: "repair", label: "Repair/renovate so extensively that vacancy is required" },
        { value: "convert", label: "Convert to non-residential use" },
      ],
    },
    {
      name: "workDetails",
      label: "Details about the work planned",
      type: "textarea",
      required: true,
      section: "Work details",
      placeholder: "Describe the planned work and how it will be carried out.",
    },
    {
      name: "permitStatus",
      label: "Permit / authorization status",
      type: "select",
      required: true,
      section: "Work details",
      options: [
        { value: "obtained", label: "Necessary permits/authorizations obtained" },
        { value: "will_obtain", label: "Will obtain necessary permits/authorizations" },
        { value: "not_required", label: "No permits/authorizations are necessary" },
      ],
    },
    {
      name: "compensationPlan",
      label: "Compensation / right-of-first-refusal notes",
      type: "textarea",
      section: "Compensation",
      placeholder: "Summarize compensation, alternative unit, or move-back/right-of-first-refusal handling.",
    },
    ...signerFields(),
  ],
  N14: [
    serviceDateField("Date notice will be given to spouse"),
    {
      name: "spouseName",
      label: "Spouse name",
      type: "text",
      required: true,
      section: "Spouse and former tenant",
      placeholder: "Use Unknown if you do not know the spouse's name.",
    },
    {
      name: "tenantWhoMovedOut",
      label: "Tenant who moved out",
      type: "text",
      required: true,
      defaultFrom: "tenantName",
      section: "Spouse and former tenant",
    },
    {
      name: "dateTenantMovedOut",
      label: "Date you believe the tenant moved out",
      type: "date",
      required: true,
      section: "Spouse and former tenant",
    },
    {
      name: "rentOwing",
      label: "Rent owing by tenant who moved out ($)",
      type: "money",
      required: true,
      section: "Rent details",
    },
    {
      name: "currentRent",
      label: "Current rent for the rental unit ($)",
      type: "money",
      required: true,
      defaultFrom: "rentAmount",
      section: "Rent details",
    },
    {
      name: "nextRentDueDate",
      label: "Date next rent payment is due",
      type: "date",
      required: true,
      section: "Rent details",
    },
    ...signerFields(),
    ...serviceAddressFields(),
  ],
  N15: [
    serviceDateField("Date tenant gives this notice"),
    {
      name: "terminationDate",
      label: "Date tenant wants tenancy to end",
      type: "date",
      required: true,
      section: "Notice dates",
      helpText: "The official N15 generally requires at least 28 days notice.",
    },
    {
      name: "tenantSigningName",
      label: "Tenant signing name",
      type: "text",
      required: true,
      defaultFrom: "tenantName",
      section: "Tenant signature",
    },
    {
      name: "confidentialityNote",
      label: "Confidential handling note",
      type: "textarea",
      section: "Safety and privacy",
      placeholder: "Optional internal note. Avoid storing sensitive details unless absolutely required.",
      helpText: "This form can involve sensitive safety information. Keep storage and access limited.",
    },
  ],
};

const GENERIC_FIELDS: LtbNoticeWizardField[] = [
  serviceDateField(),
  terminationDateField("Effective / termination date"),
  {
    name: "details",
    label: "Notice details",
    type: "textarea",
    required: true,
    section: "Details",
    placeholder: "Summarize the grounds and key dates for this notice.",
  },
  ...signerFields(),
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
