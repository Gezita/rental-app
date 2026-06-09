import { STATEMENT_UTILITY_TYPES } from "@/lib/billing-constants";
import type { UtilityType } from "@prisma/client";

export type BillingWorkflowProperty = {
  id: string;
  name: string;
  unitCount: number;
  bills: { utilityType: UtilityType; amountCents?: number }[];
  statements: {
    unitId: string;
    unitName: string;
    status: string;
    statementMonth: number;
    statementYear: number;
  }[];
};

export type BillingNextStep = {
  id: string;
  label: string;
  href: string;
  priority: number;
};

export function getMissingUtilityTypes(
  bills: { utilityType: UtilityType }[]
): UtilityType[] {
  const present = new Set(bills.map((bill) => bill.utilityType));
  return STATEMENT_UTILITY_TYPES.filter((type) => !present.has(type));
}

export function computeBillingReadiness(properties: BillingWorkflowProperty[]) {
  const totalUnits = properties.reduce((sum, property) => sum + property.unitCount, 0);
  const propertiesWithAllBills = properties.filter(
    (property) => property.unitCount > 0 && getMissingUtilityTypes(property.bills).length === 0
  ).length;

  const draftStatements = properties.flatMap((property) =>
    property.statements.filter((statement) => statement.status === "draft")
  ).length;

  const blockedUnits = properties.flatMap((property) => {
    const missing = getMissingUtilityTypes(property.bills);
    if (missing.length === 0 || property.unitCount === 0) return [];
    return property.statements
      .filter((statement) => statement.status === "draft")
      .map((statement) => ({
        propertyId: property.id,
        propertyName: property.name,
        unitName: statement.unitName,
        missing,
      }));
  });

  const readinessPercent =
    properties.length === 0
      ? 0
      : Math.round((propertiesWithAllBills / properties.length) * 100);

  return {
    totalUnits,
    propertiesWithAllBills,
    readinessPercent,
    draftStatements,
    blockedUnits,
  };
}

export function buildBillingNextSteps(
  properties: BillingWorkflowProperty[],
  monthLabel: string
): BillingNextStep[] {
  const steps: BillingNextStep[] = [];

  for (const property of properties) {
    const missing = getMissingUtilityTypes(property.bills);
    if (missing.length > 0 && property.unitCount > 0) {
      const label = missing.map((type) => type).join(", ");
      steps.push({
        id: `bill-${property.id}-${missing[0]}`,
        label: `Upload ${label} bill for ${property.name}`,
        href: `/properties/${property.id}/utility-bills/new`,
        priority: 1,
      });
    }
  }

  const draftCount = properties.flatMap((p) =>
    p.statements.filter((s) => s.status === "draft")
  ).length;

  if (draftCount > 0) {
    steps.push({
      id: "review-drafts",
      label: `Review ${draftCount} draft statement${draftCount === 1 ? "" : "s"} for ${monthLabel}`,
      href: "/billing/statements?payment=draft",
      priority: 2,
    });
  }

  if (properties.some((p) => p.unitCount > 0) && draftCount === 0) {
    steps.push({
      id: "generate",
      label: `Generate ${monthLabel} statements`,
      href: "/billing/statements/generate",
      priority: 3,
    });
  }

  return steps.sort((a, b) => a.priority - b.priority).slice(0, 5);
}
