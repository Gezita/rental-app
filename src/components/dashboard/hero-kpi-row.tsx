import { AlertCircle, Building2, CircleDollarSign, Wrench } from "lucide-react";
import { formatMoney } from "@/lib/money";
import {
  formatOccupancyHint,
  formatOutstandingHint,
  type DashboardHeroStats,
} from "@/lib/dashboard-hero-stats";
import { StatCard } from "./stat-card";

type HeroKpiRowProps = {
  stats: DashboardHeroStats;
  monthLabel: string;
  unitCount: number;
};

export function HeroKpiRow({ stats, monthLabel, unitCount }: HeroKpiRowProps) {
  const {
    monthlyCollectedCents,
    outstandingCents,
    overdueCount,
    occupancyPercent,
    vacantUnits,
    openMaintenance,
  } = stats;

  return (
    <section aria-label="Portfolio overview">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Rent collected"
          value={formatMoney(monthlyCollectedCents)}
          hint={`Received in ${monthLabel}`}
          icon={CircleDollarSign}
          accent="success"
          valueClassName="text-success"
          href="/billing/payments"
        />
        <StatCard
          label="Outstanding rent"
          value={formatMoney(outstandingCents)}
          hint={formatOutstandingHint(outstandingCents, overdueCount)}
          icon={AlertCircle}
          accent={overdueCount > 0 ? "danger" : outstandingCents > 0 ? "warning" : "neutral"}
          valueClassName={
            overdueCount > 0
              ? "text-danger"
              : outstandingCents > 0
                ? "text-warning"
                : undefined
          }
          href={
            overdueCount > 0
              ? "/billing/statements?payment=overdue"
              : outstandingCents > 0
                ? "/billing/statements?payment=unpaid"
                : "/billing/statements"
          }
        />
        <StatCard
          label="Occupancy rate"
          value={unitCount === 0 ? "—" : `${occupancyPercent}%`}
          hint={formatOccupancyHint(vacantUnits, unitCount)}
          icon={Building2}
          accent={vacantUnits > 0 ? "warning" : unitCount > 0 ? "success" : "neutral"}
          href="/properties"
        />
        <StatCard
          label="Open maintenance"
          value={openMaintenance}
          hint={
            openMaintenance === 0
              ? "No open requests"
              : `${openMaintenance} request${openMaintenance === 1 ? "" : "s"} in progress`
          }
          icon={Wrench}
          accent={openMaintenance > 0 ? "warning" : "neutral"}
          href="/maintenance?status=open"
        />
      </div>
    </section>
  );
}
