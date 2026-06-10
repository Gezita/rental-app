import { z } from "zod";
import { UTILITY_TYPES } from "@/lib/validation";

/** One saved split rule inside a utility profile. */
export type UtilityProfileRule = {
  utilityType: (typeof UTILITY_TYPES)[number];
  tenantPays: boolean;
  includedInRent: boolean;
  percentage: number;
};

const profileRulesSchema = z.array(
  z.object({
    utilityType: z.enum(UTILITY_TYPES),
    tenantPays: z.boolean(),
    includedInRent: z.boolean(),
    percentage: z.number().min(0).max(100),
  })
);

export function serializeProfileRules(rules: UtilityProfileRule[]): string {
  return JSON.stringify(rules);
}

/** Parse stored profile rules; returns [] when the payload is malformed. */
export function parseProfileRules(raw: string): UtilityProfileRule[] {
  try {
    const parsed = profileRulesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** Human-readable summary, e.g. "Gas 60% · Water 60% · Electricity included in rent". */
export function describeProfileRules(
  rules: UtilityProfileRule[],
  labels: Record<string, string>
): string {
  const parts = rules
    .filter((rule) => rule.tenantPays || rule.includedInRent || rule.percentage > 0)
    .map((rule) => {
      const label = labels[rule.utilityType] ?? rule.utilityType;
      if (rule.includedInRent) return `${label} included in rent`;
      if (rule.tenantPays) return `${label} ${rule.percentage}%`;
      return `${label} landlord pays`;
    });
  return parts.length > 0 ? parts.join(" · ") : "No utilities billed to tenant";
}
