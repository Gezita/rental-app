import { prisma } from "@/lib/db";

export async function syncOverdueStatements(userId: string) {
  const now = new Date();

  await prisma.statement.updateMany({
    where: {
      status: { in: ["sent", "partial"] },
      dueDate: { lt: now },
      unit: { property: { members: { some: { userId } } } },
    },
    data: { status: "overdue" },
  });
}
