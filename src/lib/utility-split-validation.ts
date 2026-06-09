import { prisma } from "@/lib/db";
import { STATEMENT_UTILITY_TYPES } from "@/lib/billing-constants";
import { UTILITY_TYPE_LABELS } from "@/lib/billing-constants";
import type { UtilityType } from "@prisma/client";

export type UtilitySplitValidationIssue = {
  utilityType: UtilityType;
  label: string;
  totalPercentage: number;
  issue: "incomplete" | "over_allocated" | "no_rules";
};

export async function getUtilitySplitValidationIssues(
  propertyId: string
): Promise<UtilitySplitValidationIssue[]> {
  const units = await prisma.unit.findMany({
    where: { propertyId },
    include: { utilityRules: true },
  });

  if (units.length === 0) return [];

  const issues: UtilitySplitValidationIssue[] = [];

  for (const utilityType of STATEMENT_UTILITY_TYPES) {
    let totalPercentage = 0;
    let hasPayingRule = false;

    for (const unit of units) {
      const rule = unit.utilityRules.find((row) => row.utilityType === utilityType);
      if (!rule || !rule.tenantPays || rule.includedInRent) continue;
      if (rule.percentage > 0) {
        hasPayingRule = true;
        totalPercentage += rule.percentage;
      }
    }

    if (!hasPayingRule) continue;

    if (totalPercentage === 0) {
      issues.push({
        utilityType,
        label: UTILITY_TYPE_LABELS[utilityType],
        totalPercentage: 0,
        issue: "no_rules",
      });
    } else if (totalPercentage < 100) {
      issues.push({
        utilityType,
        label: UTILITY_TYPE_LABELS[utilityType],
        totalPercentage,
        issue: "incomplete",
      });
    } else if (totalPercentage > 100) {
      issues.push({
        utilityType,
        label: UTILITY_TYPE_LABELS[utilityType],
        totalPercentage,
        issue: "over_allocated",
      });
    }
  }

  return issues;
}
