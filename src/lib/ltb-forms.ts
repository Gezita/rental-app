export type LtbFormAudience = "landlord" | "tenant" | "both";
export type LtbFormCategory = "rent_increase" | "termination" | "agreement" | "other";

export type LtbForm = {
  code: string;
  name: string;
  description: string;
  downloadUrl: string;
  instructionsUrl?: string;
  audience: LtbFormAudience;
  category: LtbFormCategory;
  primaryUse: string;
  minimumNotice?: string;
  relatedApplication?: string;
  caution?: string;
};

const LTB_BASE_URL = "https://tribunalsontario.ca/documents/ltb";
const RENT_INCREASE_FORMS = `${LTB_BASE_URL}/Notices%20of%20Rent%20Increase%20%26%20Instructions`;
const TERMINATION_FORMS = `${LTB_BASE_URL}/Notices%20of%20Termination%20%26%20Instructions`;
const OTHER_FORMS = `${LTB_BASE_URL}/Other%20Forms`;

function ltbFormPdfUrl(path: string) {
  return `${LTB_BASE_URL}/${path}`;
}

export const LTB_FORMS_INDEX_URL = "https://tribunalsontario.ca/ltb/forms-filing-and-fees/";

export const LTB_FORMS: LtbForm[] = [
  {
    code: "N1",
    name: "Notice of Rent Increase",
    description: "Landlord notice to increase rent for most rent-controlled rental units.",
    downloadUrl: `${RENT_INCREASE_FORMS}/N1.pdf`,
    instructionsUrl: `${RENT_INCREASE_FORMS}/N1%20Instructions.html`,
    audience: "landlord",
    category: "rent_increase",
    primaryUse: "Increase lawful rent where the rent increase guideline applies.",
    minimumNotice: "At least 90 days before the rent increase date.",
  },
  {
    code: "N2",
    name: "Notice of Rent Increase (Unit Partially Exempt)",
    description: "Landlord notice to increase rent for units that are partially exempt from the RTA rent rules.",
    downloadUrl: `${RENT_INCREASE_FORMS}/N2.pdf`,
    instructionsUrl: `${RENT_INCREASE_FORMS}/N2%20Instructions.html`,
    audience: "landlord",
    category: "rent_increase",
    primaryUse: "Increase rent for a partially exempt rental unit.",
    minimumNotice: "At least 90 days before the rent increase date, where applicable.",
  },
  {
    code: "N3",
    name: "Notice to Increase the Rent and/or Charges for Care Services and Meals",
    description: "Landlord notice for care-home rent, care service, and meal charge increases.",
    downloadUrl: `${RENT_INCREASE_FORMS}/N3.pdf`,
    instructionsUrl: `${RENT_INCREASE_FORMS}/N3%20Instructions.html`,
    audience: "landlord",
    category: "rent_increase",
    primaryUse: "Increase rent and/or care-home charges for care services or meals.",
    minimumNotice: "At least 90 days before the increase date.",
  },
  {
    code: "N4",
    name: "Notice to End your Tenancy Early for Non-payment of Rent",
    description: "Landlord notice when the tenant has not paid rent.",
    downloadUrl: `${TERMINATION_FORMS}/N4.pdf`,
    instructionsUrl: `${TERMINATION_FORMS}/N4%20Instructions_final_Nov30_2015.pdf`,
    audience: "landlord",
    category: "termination",
    primaryUse: "Start the non-payment of rent notice process.",
    minimumNotice: "7 days for daily/weekly tenancies; 14 days for all other tenancies.",
    relatedApplication: "L1",
    caution: "Use rent only. Do not include utilities, NSF fees, damages, deposits, or other non-rent charges.",
  },
  {
    code: "N5",
    name: "Notice to End your Tenancy for Interfering with Others, Damage or Overcrowding",
    description: "Landlord notice for interference, damage, or overcrowding issues.",
    downloadUrl: `${TERMINATION_FORMS}/N5.pdf`,
    instructionsUrl: `${TERMINATION_FORMS}/N5%20Instructions_final_Nov30_2015.pdf`,
    audience: "landlord",
    category: "termination",
    primaryUse: "Address substantial interference, damage, or overcrowding.",
    minimumNotice: "Usually 20 days for a first notice; different rules may apply for a second notice.",
    relatedApplication: "L2",
  },
  {
    code: "N6",
    name: "Notice to End your Tenancy for Illegal Acts or Misrepresenting Income in a Rent-Geared-to-Income Rental Unit",
    description: "Landlord notice for illegal acts or misrepresentation of income in RGI housing.",
    downloadUrl: `${TERMINATION_FORMS}/N6.pdf`,
    instructionsUrl: `${TERMINATION_FORMS}/N6%20Instructions_final_Nov30_2015.pdf`,
    audience: "landlord",
    category: "termination",
    primaryUse: "Address illegal acts or RGI income misrepresentation.",
    minimumNotice: "10 or 20 days depending on the reason.",
    relatedApplication: "L2",
  },
  {
    code: "N7",
    name: "Notice to End your Tenancy for Causing Serious Problems in the Rental Unit or Residential Complex",
    description: "Landlord notice for serious safety, damage, or lawful-rights issues.",
    downloadUrl: `${TERMINATION_FORMS}/N7.pdf`,
    instructionsUrl: `${TERMINATION_FORMS}/N7%20Instructions_final_Nov30_2015.pdf`,
    audience: "landlord",
    category: "termination",
    primaryUse: "Address serious safety, damage, or small-building landlord enjoyment issues.",
    minimumNotice: "Usually 10 days.",
    relatedApplication: "L2",
  },
  {
    code: "N8",
    name: "Notice to End your Tenancy at the End of the Term",
    description: "Landlord notice to end a tenancy at the end of the rental period or lease term.",
    downloadUrl: `${TERMINATION_FORMS}/N8.pdf`,
    instructionsUrl: `${TERMINATION_FORMS}/N8%20Instructions_final_Nov30_2015.pdf`,
    audience: "landlord",
    category: "termination",
    primaryUse: "Persistent late rent, end of employment tenancy, subsidized housing eligibility, and similar end-of-term reasons.",
    minimumNotice: "28 days for daily/weekly tenancies; 60 days for most other tenancies.",
    relatedApplication: "L2",
  },
  {
    code: "N9",
    name: "Tenant's Notice to End the Tenancy",
    description: "Tenant notice to end a tenancy.",
    downloadUrl: `${TERMINATION_FORMS}/N9.pdf`,
    audience: "tenant",
    category: "termination",
    primaryUse: "Tenant gives written notice to end the tenancy.",
    minimumNotice: "Often 60 days for monthly/yearly tenancies or 28 days for weekly tenancies; shorter rules can apply in specific cases.",
  },
  {
    code: "N10",
    name: "Agreement to Increase the Rent Above the Guideline",
    description: "Agreement between landlord and tenant to increase rent above the guideline.",
    downloadUrl: `${RENT_INCREASE_FORMS}/N10.pdf`,
    instructionsUrl: `${RENT_INCREASE_FORMS}/N10%20Instructions.html`,
    audience: "both",
    category: "agreement",
    primaryUse: "Document an agreed above-guideline rent increase.",
    caution: "This is an agreement, not a unilateral notice.",
  },
  {
    code: "N11",
    name: "Agreement to End the Tenancy",
    description: "Mutual agreement between landlord and tenant to end the tenancy.",
    downloadUrl: `${OTHER_FORMS}/N11.pdf`,
    audience: "both",
    category: "agreement",
    primaryUse: "Landlord and tenant mutually agree to end the tenancy on a specific date.",
    relatedApplication: "L3, if the tenant does not move out after signing.",
    caution: "Both parties should understand and voluntarily sign this agreement.",
  },
  {
    code: "N12",
    name: "Notice to End your Tenancy Because the Landlord, a Purchaser or a Family Member Requires the Rental Unit",
    description: "Landlord notice for landlord, purchaser, or qualifying family member own-use.",
    downloadUrl: `${TERMINATION_FORMS}/N12.pdf`,
    instructionsUrl: `${TERMINATION_FORMS}/N12%20Instructions_final_Nov30_2015.pdf`,
    audience: "landlord",
    category: "termination",
    primaryUse: "End a tenancy because the landlord, purchaser, or qualifying family member requires the unit.",
    minimumNotice: "At least 60 days and usually the last day of a rental period or lease term.",
    relatedApplication: "L2",
    caution: "Compensation or an acceptable alternative unit is normally required by the termination date.",
  },
  {
    code: "N13",
    name: "Notice to End your Tenancy Because the Landlord Wants to Demolish the Rental Unit, Repair it or Convert it to Another Use",
    description: "Landlord notice for demolition, extensive repairs/renovations, or conversion to another use.",
    downloadUrl: `${TERMINATION_FORMS}/N13.pdf`,
    instructionsUrl: `${TERMINATION_FORMS}/N13%20Instructions_final_Nov30_2015.pdf`,
    audience: "landlord",
    category: "termination",
    primaryUse: "End a tenancy for demolition, major repairs requiring vacancy, or conversion.",
    minimumNotice: "At least 120 days; one year for some mobile home or land lease community cases.",
    relatedApplication: "L2",
    caution: "Compensation, right of first refusal, and permit rules may apply depending on the reason.",
  },
  {
    code: "N14",
    name: "Landlord's Notice to the Spouse of the Tenant who Vacated the Rental Unit",
    description: "Landlord notice to a spouse remaining in the rental unit after the tenant vacated.",
    downloadUrl: ltbFormPdfUrl(
      "Other%20Forms/N14%20-%20Landlord%27s%20Notice%20to%20the%20Spouse%20of%20the%20Tenant%20who%20Vacated%20the%20Rental%20Unit.pdf"
    ),
    audience: "landlord",
    category: "other",
    primaryUse: "Give a remaining spouse the option to become the tenant where the former tenant moved out and owes rent.",
    minimumNotice: "Must generally be given within 45 days from the day the landlord believes the tenant moved out.",
    caution: "Do not use for every unauthorized occupant situation; confirm the N14 conditions first.",
  },
  {
    code: "N15",
    name: "Tenant's Notice to End my Tenancy Because of Fear of Sexual or Domestic Violence and Abuse",
    description: "Tenant notice to end a tenancy because of fear of sexual or domestic violence and abuse.",
    downloadUrl: `${TERMINATION_FORMS}/N15.pdf`,
    audience: "tenant",
    category: "termination",
    primaryUse: "Tenant safety-related notice to end the tenancy early.",
    minimumNotice: "At least 28 days.",
    caution: "This form can involve sensitive safety information. Limit access and avoid unnecessary storage of details.",
  },
];

export const LTB_FORM_GROUPS: { category: LtbFormCategory; title: string; description: string }[] = [
  {
    category: "rent_increase",
    title: "Rent increase notices",
    description: "Forms used to increase rent or care-home charges.",
  },
  {
    category: "termination",
    title: "Termination notices",
    description: "Forms used when a landlord or tenant is ending a tenancy.",
  },
  {
    category: "agreement",
    title: "Agreements",
    description: "Forms signed by both landlord and tenant.",
  },
  {
    category: "other",
    title: "Other N-series forms",
    description: "Special-purpose N-series forms.",
  },
];

export function getLtbForm(code: string) {
  return LTB_FORMS.find((form) => form.code === code.toUpperCase());
}

export function getLtbFormsByCategory(category: LtbFormCategory) {
  return LTB_FORMS.filter((form) => form.category === category);
}
