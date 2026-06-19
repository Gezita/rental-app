import { prisma } from "@/lib/db";
import { generateStatementsForProperty } from "@/lib/statements";
import { sendStatementById } from "@/lib/statement-send";

export type AutoBillingResult = {
  generated: number;
  sent: number;
  skipped: number;
  errors: string[];
};

export async function runAutoBillingForUser(
  userId: string,
  options?: { force?: boolean }
): Promise<AutoBillingResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true, properties: true },
  });

  const result: AutoBillingResult = {
    generated: 0,
    sent: 0,
    skipped: 0,
    errors: [],
  };

  if (!user?.settings?.autoSendStatements && !options?.force) {
    return result;
  }

  const today = new Date();
  const dayOfMonth = today.getDate();
  const settingsDay = user?.settings?.autoSendDayOfMonth ?? 1;

  if (!options?.force && dayOfMonth !== settingsDay) {
    return result;
  }

  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  for (const property of user!.properties) {
    try {
      const created = await generateStatementsForProperty(userId, property.id, month, year);
      result.generated += created.length;
    } catch (e) {
      result.errors.push(
        `Generate ${property.name}: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    }
  }

  const drafts = await prisma.statement.findMany({
    where: {
      status: "draft",
      statementMonth: month,
      statementYear: year,
      autoSentAt: null,
      // Auto-billing is scoped to the creator's OWN properties (the PropertyOwner
      // relation drives generation above). Membership scoping would let a co-owner
      // re-send the creator's drafts — keep this filtered by creator userId.
      unit: { property: { userId } },
    },
    include: { tenant: true },
  });

  for (const statement of drafts) {
    if (!statement.tenant.email) {
      result.skipped += 1;
      continue;
    }

    try {
      await sendStatementById(statement.id, userId);
      await prisma.statement.update({
        where: { id: statement.id },
        data: { autoSentAt: new Date() },
      });
      result.sent += 1;
    } catch (e) {
      result.errors.push(
        `Send ${statement.statementNumber}: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    }
  }

  return result;
}
