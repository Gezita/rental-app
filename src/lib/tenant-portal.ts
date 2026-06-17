import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { StatementStatus } from "@prisma/client";

const VISIBLE_STATEMENT_STATUSES: StatementStatus[] = [
  "sent",
  "partial",
  "paid",
  "overdue",
];

export async function requireTenantStatement(statementId: string, tenantId: string) {
  const statement = await prisma.statement.findFirst({
    where: {
      id: statementId,
      tenantId,
      status: { in: VISIBLE_STATEMENT_STATUSES },
    },
    include: {
      tenant: true,
      unit: {
        include: {
          property: {
            include: {
              user: { include: { settings: true } },
            },
          },
        },
      },
      lineItems: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { paymentDate: "desc" } },
      pdfDocument: true,
    },
  });

  if (!statement) notFound();
  return statement;
}

export async function listTenantStatements(tenantId: string) {
  return prisma.statement.findMany({
    where: {
      tenantId,
      status: { in: VISIBLE_STATEMENT_STATUSES },
    },
    orderBy: [{ statementYear: "desc" }, { statementMonth: "desc" }],
  });
}

export async function listTenantDocuments(tenantId: string) {
  return prisma.document.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}

export async function listTenantNotices(tenantId: string) {
  return prisma.document.findMany({
    where: {
      tenantId,
      category: { in: ["ltb_notice", "notice"] },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTenantPortalSummary(tenantId: string) {
  const statements = await listTenantStatements(tenantId);
  const outstandingCents = statements.reduce((sum, statement) => {
    if (statement.status === "paid") return sum;
    const due = statement.totalDueCents - statement.paidAmountCents;
    return sum + Math.max(0, due);
  }, 0);

  const overdueCount = statements.filter((statement) => statement.status === "overdue").length;

  return {
    statementCount: statements.length,
    outstandingCents,
    overdueCount,
    recentStatements: statements.slice(0, 5),
  };
}
