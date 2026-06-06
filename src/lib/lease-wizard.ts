import type { UtilityRule, UtilityType } from "@prisma/client";
import { UTILITY_TYPE_LABELS } from "@/lib/billing-constants";

export type LeaseWizardInput = {
  landlordName: string;
  landlordEmail?: string;
  propertyName: string;
  propertyAddress: string;
  unitName: string;
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  leaseStartDate: Date;
  leaseEndDate?: Date | null;
  rentAmountCents: number;
  rentDueDay: number;
  securityDepositCents?: number | null;
  lastMonthRentDeposit: boolean;
  parkingIncluded: boolean;
  petsAllowed: "yes" | "no" | "with_permission";
  smokingAllowed: boolean;
  utilityRules: UtilityRule[];
  additionalTerms?: string;
};

export function formatLeaseTerm(endDate?: Date | null): string {
  if (!endDate) return "Month-to-month (continues until ended per the Residential Tenancies Act)";
  return `Fixed term ending ${endDate.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`;
}

export function buildUtilityTerms(rules: UtilityRule[]): string[] {
  const lines: string[] = [];
  const sorted = [...rules].sort((a, b) =>
    a.utilityType.localeCompare(b.utilityType)
  );

  for (const rule of sorted) {
    const label = UTILITY_TYPE_LABELS[rule.utilityType as UtilityType];
    if (rule.includedInRent) {
      lines.push(`${label}: included in rent.`);
    } else if (rule.tenantPays && rule.percentage > 0) {
      const note = rule.notes ? ` (${rule.notes})` : "";
      lines.push(
        `${label}: tenant pays ${rule.percentage}% of the building bill, apportioned per Ontario Regulation 394/10.${note}`
      );
    } else if (rule.tenantPays) {
      lines.push(`${label}: tenant pays 100% of the bill.`);
    } else {
      lines.push(`${label}: landlord pays.`);
    }
  }

  if (lines.length === 0) {
    lines.push(
      "Utilities: as agreed between landlord and tenant. Shared-meter apportionment must comply with Ontario Regulation 394/10 when applicable."
    );
  }

  return lines;
}

export function buildPetsClause(pets: LeaseWizardInput["petsAllowed"]): string {
  if (pets === "yes") return "Pets are permitted subject to applicable law and building rules.";
  if (pets === "with_permission")
    return "Pets require written landlord permission before move-in.";
  return "No pets without written landlord permission.";
}
