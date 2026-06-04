export type LtbForm = {
  code: string;
  name: string;
  description: string;
  downloadUrl: string;
};

export const LTB_FORMS: LtbForm[] = [
  {
    code: "N1",
    name: "Notice of Rent Increase",
    description: "Landlord notice to increase rent for a rental unit.",
    downloadUrl:
      "https://tribunalsontario.ca/documents/ltb/forms/Notice%20of%20Rent%20Increase.pdf",
  },
  {
    code: "N2",
    name: "Notice of Rent Increase (Care Home)",
    description: "Notice of rent increase for care home tenancies.",
    downloadUrl: "https://tribunalsontario.ca/documents/ltb/forms/Notice%20of%20Rent%20Increase%20-%20Care%20Home.pdf",
  },
  {
    code: "N3",
    name: "Notice to Increase Rent and/or Charges for a Care Home",
    description: "Notice for care home rent and/or charge increases.",
    downloadUrl:
      "https://tribunalsontario.ca/documents/ltb/forms/Notice%20to%20Increase%20Rent%20and%20or%20Charges%20for%20a%20Care%20Home.pdf",
  },
  {
    code: "N4",
    name: "Notice to End Tenancy Early for Non-payment of Rent",
    description: "Notice when the tenant has not paid rent.",
    downloadUrl:
      "https://tribunalsontario.ca/documents/ltb/forms/Notice%20to%20End%20a%20Tenancy%20Early%20for%20Non-payment%20of%20Rent.pdf",
  },
  {
    code: "N5",
    name: "Notice to End Tenancy for Interfering with Others, Damage, or Overcrowding",
    description: "Notice for tenant conduct issues.",
    downloadUrl:
      "https://tribunalsontario.ca/documents/ltb/forms/Notice%20to%20End%20your%20Tenancy%20for%20Interfering%20with%20Others%20Damage%20or%20Overcrowding.pdf",
  },
  {
    code: "N6",
    name: "Notice to End Tenancy for Illegal Acts or Misrepresenting Income",
    description: "Notice for illegal acts or misrepresented income in social housing.",
    downloadUrl:
      "https://tribunalsontario.ca/documents/ltb/forms/Notice%20to%20End%20your%20Tenancy%20for%20Illegal%20Acts%20or%20Misrepresenting%20Income.pdf",
  },
  {
    code: "N7",
    name: "Notice to End Tenancy for Causing Serious Problems",
    description: "Notice for seriously impairing safety or lawful rights.",
    downloadUrl:
      "https://tribunalsontario.ca/documents/ltb/forms/Notice%20to%20End%20your%20Tenancy%20for%20Causing%20Serious%20Problems.pdf",
  },
  {
    code: "N8",
    name: "Notice to End Tenancy at End of the Term",
    description: "Notice to end tenancy at the end of a fixed term.",
    downloadUrl:
      "https://tribunalsontario.ca/documents/ltb/forms/Notice%20to%20End%20your%20Tenancy%20at%20the%20End%20of%20the%20Term.pdf",
  },
  {
    code: "N9",
    name: "Tenant's Notice to End the Tenancy",
    description: "Tenant notice to end tenancy.",
    downloadUrl:
      "https://tribunalsontario.ca/documents/ltb/forms/Tenant%27s%20Notice%20to%20End%20the%20Tenancy.pdf",
  },
  {
    code: "N10",
    name: "Agreement to End the Tenancy",
    description: "Mutual agreement between landlord and tenant to end tenancy.",
    downloadUrl:
      "https://tribunalsontario.ca/documents/ltb/forms/Agreement%20to%20End%20the%20Tenancy.pdf",
  },
  {
    code: "N11",
    name: "Agreement to End the Tenancy (Standard Form)",
    description: "Standard agreement form to end tenancy.",
    downloadUrl:
      "https://tribunalsontario.ca/documents/ltb/forms/Agreement%20to%20End%20the%20Tenancy%20-%20Standard%20Form.pdf",
  },
  {
    code: "N12",
    name: "Notice to End Tenancy Because the Landlord Requires the Rental Unit",
    description: "Notice for landlord, purchaser, or family member own use.",
    downloadUrl:
      "https://tribunalsontario.ca/documents/ltb/forms/Notice%20to%20End%20your%20Tenancy%20Because%20the%20Landlord%20a%20Purchaser%20or%20a%20Family%20Member%20Requires%20the%20Rental%20Unit.pdf",
  },
  {
    code: "N13",
    name: "Notice to End Tenancy Because the Landlord Wants to Demolish, Convert, or Repair",
    description: "Notice for demolition, conversion, or extensive repairs.",
    downloadUrl:
      "https://tribunalsontario.ca/documents/ltb/forms/Notice%20to%20End%20your%20Tenancy%20Because%20the%20Landlord%20Wants%20to%20Demolish%20Convert%20or%20Repair.pdf",
  },
  {
    code: "N14",
    name: "Landlord's Notice to a Spouse of the Tenant who Vacated the Rental Unit",
    description: "Notice related to a spouse after tenant vacated.",
    downloadUrl:
      "https://tribunalsontario.ca/documents/ltb/forms/Landlord%27s%20Notice%20to%20a%20Spouse%20of%20the%20Tenant%20who%20Vacated%20the%20Rental%20Unit.pdf",
  },
];

export function getLtbForm(code: string) {
  return LTB_FORMS.find((form) => form.code === code.toUpperCase());
}

export const LTB_FORMS_INDEX_URL = "https://tribunalsontario.ca/ltb/forms/";
