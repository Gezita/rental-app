import type { UtilityType } from "@prisma/client";

type UnitWithRules = {
  id: string;
  name: string;
  utilityRules: {
    utilityType: UtilityType;
    tenantPays: boolean;
    includedInRent: boolean;
    percentage: number;
  }[];
};

export type UtilitySplitPreviewRow = {
  unitId: string;
  unitName: string;
  percentage: number;
  amountCents: number;
};

export function computeUtilitySplitPreview(
  amountCents: number,
  utilityType: UtilityType,
  units: UnitWithRules[]
): UtilitySplitPreviewRow[] {
  const splitData: UtilitySplitPreviewRow[] = [];

  for (const unit of units) {
    const rule = unit.utilityRules.find((row) => row.utilityType === utilityType);
    if (!rule || !rule.tenantPays || rule.includedInRent) continue;

    const percentage = rule.percentage;
    const unitAmountCents = Math.round((amountCents * percentage) / 100);
    if (unitAmountCents <= 0) continue;

    splitData.push({
      unitId: unit.id,
      unitName: unit.name,
      percentage,
      amountCents: unitAmountCents,
    });
  }

  if (splitData.length > 0) {
    // Mirror statements.ts: only reconcile the rounding remainder when tenants
    // are configured to pay 100% of the bill. Partial splits leave the
    // unallocated portion as landlord-paid rather than charging a tenant.
    const totalPercentage = splitData.reduce((sum, row) => sum + row.percentage, 0);
    if (totalPercentage === 100) {
      const allocated = splitData.reduce((sum, row) => sum + row.amountCents, 0);
      const remainder = amountCents - allocated;
      if (remainder !== 0) {
        let largestIndex = 0;
        for (let i = 1; i < splitData.length; i += 1) {
          if (splitData[i].amountCents > splitData[largestIndex].amountCents) {
            largestIndex = i;
          }
        }
        splitData[largestIndex].amountCents += remainder;
      }
    }
  }

  return splitData;
}
