import type { PortfolioStats } from "@/lib/portfolio-stats";

export type DashboardHeroStats = {
  monthlyCollectedCents: number;
  outstandingCents: number;
  overdueCount: number;
  occupancyPercent: number;
  vacantUnits: number;
  openMaintenance: number;
};

export function computeDashboardHeroStats(params: {
  portfolio: PortfolioStats;
  monthlyCollectedCents: number;
  outstandingCents: number;
  overdueCount: number;
  openMaintenance: number;
}): DashboardHeroStats {
  const { portfolio, monthlyCollectedCents, outstandingCents, overdueCount, openMaintenance } =
    params;
  const vacantUnits = portfolio.unitCount - portfolio.occupiedUnitCount;
  const occupancyPercent =
    portfolio.unitCount > 0
      ? Math.round((portfolio.occupiedUnitCount / portfolio.unitCount) * 100)
      : 0;

  return {
    monthlyCollectedCents,
    outstandingCents,
    overdueCount,
    occupancyPercent,
    vacantUnits,
    openMaintenance,
  };
}

export function formatOccupancyHint(vacantUnits: number, unitCount: number): string {
  if (unitCount === 0) return "No units yet";
  if (vacantUnits === 0) return "Fully occupied";
  return `${vacantUnits} vacant unit${vacantUnits === 1 ? "" : "s"}`;
}

export function formatOutstandingHint(outstandingCents: number, overdueCount: number): string {
  if (outstandingCents === 0) return "All caught up";
  if (overdueCount === 0) return "Unpaid, not yet overdue";
  return `${overdueCount} overdue statement${overdueCount === 1 ? "" : "s"}`;
}
