type UnitWithTenants = {
  rentAmountCents: number;
  tenants: { id: string }[];
};

export type PortfolioStats = {
  propertyCount: number;
  unitCount: number;
  occupiedUnitCount: number;
  activeTenantCount: number;
  scheduledRentCents: number;
  occupiedRentCents: number;
};

export function computePortfolioStats(
  properties: { units: UnitWithTenants[] }[]
): PortfolioStats {
  let unitCount = 0;
  let occupiedUnitCount = 0;
  let activeTenantCount = 0;
  let scheduledRentCents = 0;
  let occupiedRentCents = 0;

  for (const property of properties) {
    for (const unit of property.units) {
      unitCount += 1;
      scheduledRentCents += unit.rentAmountCents;
      if (unit.tenants.length > 0) {
        occupiedUnitCount += 1;
        occupiedRentCents += unit.rentAmountCents;
        activeTenantCount += unit.tenants.length;
      }
    }
  }

  return {
    propertyCount: properties.length,
    unitCount,
    occupiedUnitCount,
    activeTenantCount,
    scheduledRentCents,
    occupiedRentCents,
  };
}
