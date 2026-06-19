import { prisma } from "@/lib/db";
import { differenceInCalendarDays } from "date-fns";

export type LeaseReminder = {
  leaseId: string;
  unitId: string;
  unitName: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  leaseEndDate: Date;
  daysRemaining: number;
};

export async function getLeasesEndingSoon(
  userId: string,
  withinDays: number
): Promise<LeaseReminder[]> {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + withinDays);

  const leases = await prisma.lease.findMany({
    where: {
      status: "active",
      leaseEndDate: { not: null, gte: now, lte: cutoff },
      unit: { property: { members: { some: { userId } } } },
    },
    include: {
      tenant: true,
      unit: { include: { property: true } },
    },
    orderBy: { leaseEndDate: "asc" },
  });

  return leases
    .filter((l): l is typeof l & { leaseEndDate: Date } => l.leaseEndDate !== null)
    .map((lease) => ({
      leaseId: lease.id,
      unitId: lease.unitId,
      unitName: lease.unit.name,
      propertyId: lease.unit.propertyId,
      propertyName: lease.unit.property.name,
      tenantName: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
      leaseEndDate: lease.leaseEndDate,
      daysRemaining: differenceInCalendarDays(lease.leaseEndDate, now),
    }));
}
