import { prisma } from "@/lib/db";
import {
  computeStatementTotalsForUnit,
  loadUtilityBillsForStatementMonth,
  recalculatePropertyUtilitySplits,
} from "@/lib/statements";

export type StatementPreviewRow = {
  unitId: string;
  unitName: string;
  propertyId: string;
  propertyName: string;
  tenantName: string | null;
  rentAmountCents: number;
  utilityTotalCents: number;
  previousBalanceCents: number;
  adjustmentTotalCents: number;
  totalDueCents: number;
  status: "ready" | "no_tenant" | "blocked";
  warnings: string[];
};

export async function previewStatementsForUnits(
  userId: string,
  unitIds: string[],
  month: number,
  year: number
): Promise<StatementPreviewRow[]> {
  const units = await prisma.unit.findMany({
    where: {
      id: { in: unitIds },
      property: { userId },
    },
    include: {
      property: true,
      tenants: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ property: { name: "asc" } }, { name: "asc" }],
  });

  const propertyIds = [...new Set(units.map((unit) => unit.propertyId))];
  const billsByProperty = new Map<
    string,
    Awaited<ReturnType<typeof loadUtilityBillsForStatementMonth>>
  >();

  for (const propertyId of propertyIds) {
    await recalculatePropertyUtilitySplits(propertyId, { month, year });
    billsByProperty.set(
      propertyId,
      await loadUtilityBillsForStatementMonth(propertyId, month, year)
    );
  }

  const rows: StatementPreviewRow[] = [];

  for (const unit of units) {
    const tenant = unit.tenants[0];
    if (!tenant) {
      rows.push({
        unitId: unit.id,
        unitName: unit.name,
        propertyId: unit.propertyId,
        propertyName: unit.property.name,
        tenantName: null,
        rentAmountCents: unit.rentAmountCents,
        utilityTotalCents: 0,
        previousBalanceCents: 0,
        adjustmentTotalCents: 0,
        totalDueCents: 0,
        status: "no_tenant",
        warnings: ["No active tenant"],
      });
      continue;
    }

    const utilityBills = billsByProperty.get(unit.propertyId) ?? [];
    const totals = await computeStatementTotalsForUnit(unit.id, month, year, { utilityBills });

    const warnings: string[] = [];
    if (!tenant.email) {
      warnings.push("Tenant has no email — you can generate but cannot send yet");
    }

    rows.push({
      unitId: unit.id,
      unitName: unit.name,
      propertyId: unit.propertyId,
      propertyName: unit.property.name,
      tenantName: `${tenant.firstName} ${tenant.lastName}`,
      rentAmountCents: totals?.rentAmountCents ?? unit.rentAmountCents,
      utilityTotalCents: totals?.utilityTotalCents ?? 0,
      previousBalanceCents: totals?.previousBalanceCents ?? 0,
      adjustmentTotalCents: totals?.adjustmentTotalCents ?? 0,
      totalDueCents: totals?.totalDueCents ?? unit.rentAmountCents,
      status: warnings.length > 0 ? "blocked" : "ready",
      warnings,
    });
  }

  return rows;
}
