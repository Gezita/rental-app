import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export type T776PropertySection = {
  propertyId: string;
  propertyName: string;
  address: string;
  unitCount: number;
  grossRentalIncomeCents: number;
  propertyTaxCents: number;
  insuranceCents: number;
  mortgageInterestCents: number;
  maintenanceCents: number;
  utilityBillsCents: number;
  utilityRecoveriesCents: number;
  netUtilityExpenseCents: number;
  totalExpensesCents: number;
  netIncomeCents: number;
};

export type T776Report = {
  year: number;
  landlordName: string;
  generatedAt: Date;
  properties: T776PropertySection[];
  totals: Omit<T776PropertySection, "propertyId" | "propertyName" | "address"> & {
    propertyName: string;
    address: string;
  };
};

function yearRange(year: number) {
  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

export async function buildT776Report(userId: string, year: number): Promise<T776Report> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true, properties: true },
  });
  if (!user) throw new Error("User not found");

  const { start, end } = yearRange(year);
  const landlordName = user.settings?.landlordName || user.name || user.email;

  const properties: T776PropertySection[] = [];

  for (const property of user.properties) {
    const units = await prisma.unit.findMany({
      where: { propertyId: property.id },
      select: { id: true },
    });
    const unitIds = units.map((u) => u.id);
    const unitCount = units.length;

    const payments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: start, lte: end },
        statement: { unitId: { in: unitIds } },
      },
      select: { amountCents: true },
    });
    const grossRentalIncomeCents = payments.reduce((s, p) => s + p.amountCents, 0);

    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where: {
        propertyId: property.id,
        status: "completed",
        maintenanceDate: { gte: start, lte: end },
        costCents: { not: null },
      },
    });
    const maintenanceCents = maintenanceRecords.reduce(
      (s, r) => s + (r.costCents ?? 0),
      0
    );

    const utilityBills = await prisma.utilityBill.findMany({
      where: {
        propertyId: property.id,
        OR: [
          { billYear: year },
          {
            billingPeriodStart: { lte: end },
            billingPeriodEnd: { gte: start },
          },
        ],
      },
    });
    const utilityBillsCents = utilityBills.reduce((s, b) => s + b.amountCents, 0);

    const utilityLineItems = await prisma.statementLineItem.findMany({
      where: {
        type: "utility",
        statement: {
          unitId: { in: unitIds },
          statementYear: year,
        },
      },
      select: { amountCents: true },
    });
    const utilityRecoveriesCents = utilityLineItems.reduce((s, li) => s + li.amountCents, 0);
    const netUtilityExpenseCents = Math.max(0, utilityBillsCents - utilityRecoveriesCents);

    const propertyTaxCents = property.annualPropertyTaxCents ?? 0;
    const insuranceCents = property.annualInsurancePremiumCents ?? 0;
    const mortgageInterestCents = property.mortgageInterestAnnualCents ?? 0;

    const totalExpensesCents =
      propertyTaxCents +
      insuranceCents +
      mortgageInterestCents +
      maintenanceCents +
      netUtilityExpenseCents;

    const address = [
      property.addressLine1,
      property.city,
      property.province,
      property.postalCode,
    ]
      .filter(Boolean)
      .join(", ");

    properties.push({
      propertyId: property.id,
      propertyName: property.name,
      address,
      unitCount,
      grossRentalIncomeCents,
      propertyTaxCents,
      insuranceCents,
      mortgageInterestCents,
      maintenanceCents,
      utilityBillsCents,
      utilityRecoveriesCents,
      netUtilityExpenseCents,
      totalExpensesCents,
      netIncomeCents: grossRentalIncomeCents - totalExpensesCents,
    });
  }

  const totals = properties.reduce(
    (acc, p) => ({
      propertyName: "Portfolio total",
      address: `${properties.length} propert${properties.length === 1 ? "y" : "ies"}`,
      unitCount: acc.unitCount + p.unitCount,
      grossRentalIncomeCents: acc.grossRentalIncomeCents + p.grossRentalIncomeCents,
      propertyTaxCents: acc.propertyTaxCents + p.propertyTaxCents,
      insuranceCents: acc.insuranceCents + p.insuranceCents,
      mortgageInterestCents: acc.mortgageInterestCents + p.mortgageInterestCents,
      maintenanceCents: acc.maintenanceCents + p.maintenanceCents,
      utilityBillsCents: acc.utilityBillsCents + p.utilityBillsCents,
      utilityRecoveriesCents: acc.utilityRecoveriesCents + p.utilityRecoveriesCents,
      netUtilityExpenseCents: acc.netUtilityExpenseCents + p.netUtilityExpenseCents,
      totalExpensesCents: acc.totalExpensesCents + p.totalExpensesCents,
      netIncomeCents: acc.netIncomeCents + p.netIncomeCents,
    }),
    {
      propertyName: "Portfolio total",
      address: "",
      unitCount: 0,
      grossRentalIncomeCents: 0,
      propertyTaxCents: 0,
      insuranceCents: 0,
      mortgageInterestCents: 0,
      maintenanceCents: 0,
      utilityBillsCents: 0,
      utilityRecoveriesCents: 0,
      netUtilityExpenseCents: 0,
      totalExpensesCents: 0,
      netIncomeCents: 0,
    }
  );

  return {
    year,
    landlordName,
    generatedAt: new Date(),
    properties,
    totals,
  };
}

export function formatT776LineLabel(line: string, amountCents: number): string {
  return `${line}: ${formatMoney(amountCents)}`;
}
