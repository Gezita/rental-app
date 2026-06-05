export type LtbForm = {
  code: string;
  name: string;
  description: string;
  downloadUrl: string;
};

const LTB_BASE_URL = "https://tribunalsontario.ca/documents/ltb";
const RENT_INCREASE_FORMS = `${LTB_BASE_URL}/Notices%20of%20Rent%20Increase%20%26%20Instructions`;
const TERMINATION_FORMS = `${LTB_BASE_URL}/Notices%20of%20Termination%20%26%20Instructions`;
const OTHER_FORMS = `${LTB_BASE_URL}/Other%20Forms`;

function ltbFormPdfUrl(path: string) {
  return `${LTB_BASE_URL}/${path}`;
}

export const LTB_FORMS: LtbForm[] = [
  {
    code: "N1",
    name: "Notice of Rent Increase",
    description: "Landlord notice to increase rent for a rental unit.",
    downloadUrl: `${RENT_INCREASE_FORMS}/N1.pdf`,
  },
  {
    code: "N2",
    name: "Notice of Rent Increase (Care Home)",
    description: "Notice of rent increase for care home tenancies.",
    downloadUrl: `${RENT_INCREASE_FORMS}/N2.pdf`,
  },
  {
    code: "N3",
    name: "Notice to Increase Rent and/or Charges for a Care Home",
    description: "Notice for care home rent and/or charge increases.",
    downloadUrl: `${RENT_INCREASE_FORMS}/N3.pdf`,
  },
  {
    code: "N4",
    name: "Notice to End Tenancy Early for Non-payment of Rent",
    description: "Notice when the tenant has not paid rent.",
    downloadUrl: `${TERMINATION_FORMS}/N4.pdf`,
  },
  {
    code: "N5",
    name: "Notice to End Tenancy for Interfering with Others, Damage, or Overcrowding",
    description: "Notice for tenant conduct issues.",
    downloadUrl: `${TERMINATION_FORMS}/N5.pdf`,
  },
  {
    code: "N6",
    name: "Notice to End Tenancy for Illegal Acts or Misrepresenting Income",
    description: "Notice for illegal acts or misrepresented income in social housing.",
    downloadUrl: `${TERMINATION_FORMS}/N6.pdf`,
  },
  {
    code: "N7",
    name: "Notice to End Tenancy for Causing Serious Problems",
    description: "Notice for seriously impairing safety or lawful rights.",
    downloadUrl: `${TERMINATION_FORMS}/N7.pdf`,
  },
  {
    code: "N8",
    name: "Notice to End Tenancy at End of the Term",
    description: "Notice to end tenancy at the end of a fixed term.",
    downloadUrl: `${TERMINATION_FORMS}/N8.pdf`,
  },
  {
    code: "N9",
    name: "Tenant's Notice to End the Tenancy",
    description: "Tenant notice to end tenancy.",
    downloadUrl: `${TERMINATION_FORMS}/N9.pdf`,
  },
  {
    code: "N10",
    name: "Agreement to End the Tenancy",
    description: "Mutual agreement between landlord and tenant to end tenancy.",
    downloadUrl: `${RENT_INCREASE_FORMS}/N10.pdf`,
  },
  {
    code: "N11",
    name: "Agreement to End the Tenancy (Standard Form)",
    description: "Standard agreement form to end tenancy.",
    downloadUrl: `${OTHER_FORMS}/N11.pdf`,
  },
  {
    code: "N12",
    name: "Notice to End Tenancy Because the Landlord Requires the Rental Unit",
    description: "Notice for landlord, purchaser, or family member own use.",
    downloadUrl: `${TERMINATION_FORMS}/N12.pdf`,
  },
  {
    code: "N13",
    name: "Notice to End Tenancy Because the Landlord Wants to Demolish, Convert, or Repair",
    description: "Notice for demolition, conversion, or extensive repairs.",
    downloadUrl: `${TERMINATION_FORMS}/N13.pdf`,
  },
  {
    code: "N14",
    name: "Landlord's Notice to a Spouse of the Tenant who Vacated the Rental Unit",
    description: "Notice related to a spouse after tenant vacated.",
    downloadUrl: ltbFormPdfUrl(
      "Other%20Forms/N14%20-%20Landlord%27s%20Notice%20to%20the%20Spouse%20of%20the%20Tenant%20who%20Vacated%20the%20Rental%20Unit.pdf"
    ),
  },
];

export function getLtbForm(code: string) {
  return LTB_FORMS.find((form) => form.code === code.toUpperCase());
}

export const LTB_FORMS_INDEX_URL = "https://tribunalsontario.ca/ltb/forms/";
