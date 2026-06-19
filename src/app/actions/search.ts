"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MONTH_NAMES } from "@/lib/billing-constants";

export type GlobalSearchResultType =
  | "property"
  | "unit"
  | "tenant"
  | "document"
  | "statement";

export type GlobalSearchResult = {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle: string;
  href: string;
};

const RESULTS_PER_TYPE = 5;

export async function globalSearchAction(query: string): Promise<GlobalSearchResult[]> {
  const user = await requireUser();
  const q = query.trim();
  if (q.length < 2) return [];

  const [properties, units, tenants, documents, statements] = await Promise.all([
    prisma.property.findMany({
      where: {
        members: { some: { userId: user.id } },
        OR: [
          { name: { contains: q } },
          { addressLine1: { contains: q } },
          { city: { contains: q } },
        ],
      },
      select: { id: true, name: true, addressLine1: true, city: true },
      take: RESULTS_PER_TYPE,
    }),
    prisma.unit.findMany({
      where: {
        property: { members: { some: { userId: user.id } } },
        name: { contains: q },
      },
      select: {
        id: true,
        name: true,
        propertyId: true,
        property: { select: { name: true } },
      },
      take: RESULTS_PER_TYPE,
    }),
    prisma.tenant.findMany({
      where: {
        unit: { property: { members: { some: { userId: user.id } } } },
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isActive: true,
        unit: {
          select: { id: true, name: true, propertyId: true, property: { select: { name: true } } },
        },
      },
      take: RESULTS_PER_TYPE,
    }),
    prisma.document.findMany({
      where: {
        userId: user.id,
        OR: [{ fileName: { contains: q } }, { tags: { contains: q } }, { notes: { contains: q } }],
      },
      select: {
        id: true,
        fileName: true,
        category: true,
        property: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: RESULTS_PER_TYPE,
    }),
    prisma.statement.findMany({
      where: {
        unit: { property: { members: { some: { userId: user.id } } } },
        statementNumber: { contains: q },
      },
      select: {
        id: true,
        statementNumber: true,
        statementMonth: true,
        statementYear: true,
        status: true,
        unit: { select: { name: true, property: { select: { name: true } } } },
      },
      orderBy: [{ statementYear: "desc" }, { statementMonth: "desc" }],
      take: RESULTS_PER_TYPE,
    }),
  ]);

  const results: GlobalSearchResult[] = [
    ...properties.map((p) => ({
      id: p.id,
      type: "property" as const,
      title: p.name,
      subtitle: `${p.addressLine1}, ${p.city}`,
      href: `/properties/${p.id}`,
    })),
    ...units.map((u) => ({
      id: u.id,
      type: "unit" as const,
      title: u.name,
      subtitle: u.property.name,
      href: `/properties/${u.propertyId}/units/${u.id}`,
    })),
    ...tenants.map((t) => ({
      id: t.id,
      type: "tenant" as const,
      title: `${t.firstName} ${t.lastName}`,
      subtitle: `${t.unit.property.name} · ${t.unit.name}${t.isActive ? "" : " · former"}`,
      href: `/properties/${t.unit.propertyId}/units/${t.unit.id}`,
    })),
    ...documents.map((d) => ({
      id: d.id,
      type: "document" as const,
      title: d.fileName,
      subtitle: `${d.category.replaceAll("_", " ")}${d.property ? ` · ${d.property.name}` : ""}`,
      href: `/documents?q=${encodeURIComponent(d.fileName)}`,
    })),
    ...statements.map((s) => ({
      id: s.id,
      type: "statement" as const,
      title: s.statementNumber,
      subtitle: `${MONTH_NAMES[s.statementMonth - 1]} ${s.statementYear} · ${s.unit.property.name} · ${s.unit.name} · ${s.status}`,
      href: `/billing/statements/${s.id}`,
    })),
  ];

  return results;
}
