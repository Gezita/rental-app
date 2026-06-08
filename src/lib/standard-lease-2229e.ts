import type { UtilityRule } from "@prisma/client";
import { buildUtilityTerms } from "./lease-wizard";

export const STANDARD_LEASE_2229E_URL =
  "https://forms.mgcs.gov.on.ca/dataset/edff7620-980b-455f-9666-643196d8312f/resource/929691d6-56bf-4d64-8474-0e434bb2d32d/download/2229e.pdf";

export type StandardLease2229eInput = {
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
  leaseStartDate: Date;
  leaseEndDate?: Date | null;
  rentAmountCents: number;
  rentDueDay: number;
  rentPaymentMethod?: string;
  partialRentCents?: number | null;
  partialRentStartDate?: Date | null;
  partialRentEndDate?: Date | null;
  servicesIncluded: string[];
  utilitiesTenantPays: string[];
  utilitiesLandlordPays: string[];
  utilityRules: UtilityRule[];
  rentDepositCents?: number | null;
  keyDepositCents?: number | null;
  smokingAllowed: boolean;
  petsAllowed: "yes" | "no" | "with_permission";
  parkingIncluded: boolean;
  additionalTerms?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
};

export function buildServicesIncluded(input: StandardLease2229eInput): string[] {
  const services = [...input.servicesIncluded];
  if (input.parkingIncluded && !services.some((s) => /parking/i.test(s))) {
    services.push("Parking");
  }
  return services.length > 0 ? services : ["None specified"];
}

export function build2229eUtilitySummary(input: StandardLease2229eInput): string[] {
  const fromRules = buildUtilityTerms(input.utilityRules);
  if (fromRules.length > 0) return fromRules;

  const lines: string[] = [];
  if (input.utilitiesLandlordPays.length > 0) {
    lines.push(`Landlord pays: ${input.utilitiesLandlordPays.join(", ")}.`);
  }
  if (input.utilitiesTenantPays.length > 0) {
    lines.push(`Tenant pays: ${input.utilitiesTenantPays.join(", ")}.`);
  }
  if (lines.length === 0) {
    lines.push("Utilities and services as agreed in Part 6 of the Standard Lease.");
  }
  return lines;
}

export function format2229eTerm(endDate?: Date | null): string {
  if (!endDate) {
    return "Periodic tenancy (month-to-month) — no fixed end date";
  }
  return `Fixed term ending ${endDate.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`;
}
