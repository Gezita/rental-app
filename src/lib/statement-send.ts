import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/server/emails/send";
import { formatMoney } from "@/lib/money";
import { generateStatementPdf } from "@/lib/pdf";
import { MONTH_NAMES } from "@/lib/billing-constants";
import { buildStatementEmailContent } from "@/lib/tenant-communications";
import { getAppUrl, isStripeConfigured } from "@/lib/stripe";

export function createPayToken(): string {
  return randomBytes(16).toString("hex");
}

export function getStatementPayUrl(payToken: string): string {
  return `${getAppUrl()}/pay/${payToken}`;
}

export async function sendStatementById(statementId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true },
  });
  if (!user) throw new Error("User not found");

  const statement = await prisma.statement.findFirst({
    where: { id: statementId, unit: { property: { userId } } },
    include: {
      tenant: true,
      unit: { include: { property: true } },
      lineItems: true,
    },
  });

  if (!statement) throw new Error("Statement not found");
  if (!statement.tenant.email) throw new Error("Tenant email is required to send statement");
  if (statement.status !== "draft") {
    throw new Error("Only draft statements can be sent");
  }

  const payToken = statement.payToken ?? createPayToken();
  const settings = user.settings;
  const landlordName = settings?.landlordName || user.name || user.email;
  const monthLabel = `${MONTH_NAMES[statement.statementMonth - 1]} ${statement.statementYear}`;
  const propertyAddress = [
    statement.unit.property.addressLine1,
    statement.unit.property.city,
    statement.unit.property.province,
  ]
    .filter(Boolean)
    .join(", ");

  const doc = await generateStatementPdf({
    userId: user.id,
    propertyId: statement.unit.propertyId,
    unitId: statement.unitId,
    tenantId: statement.tenantId,
    statementId: statement.id,
    landlordName,
    propertyAddress,
    unitName: statement.unit.name,
    tenantName: `${statement.tenant.firstName} ${statement.tenant.lastName}`,
    statementNumber: statement.statementNumber,
    statementMonth: monthLabel,
    issueDate: statement.issueDate.toLocaleDateString("en-CA"),
    dueDate: statement.dueDate.toLocaleDateString("en-CA"),
    lineItems: statement.lineItems.map((li) => ({
      description: li.description,
      amountCents: li.amountCents,
      note: li.calculationNote ?? undefined,
    })),
    totalDueCents: statement.totalDueCents,
    paymentInstructions: settings?.paymentInstructions ?? undefined,
    notes: statement.notes ?? undefined,
  });

  const stripeEnabled = settings?.stripePaymentsEnabled && isStripeConfigured();
  const payUrl = getStatementPayUrl(payToken);

  const emailContent = buildStatementEmailContent({
    tenantName: statement.tenant.firstName,
    unitName: statement.unit.name,
    propertyName: statement.unit.property.name,
    propertyAddress,
    monthLabel,
    totalDue: formatMoney(statement.totalDueCents),
    dueDate: statement.dueDate.toLocaleDateString("en-CA"),
    paymentInstructions: settings?.paymentInstructions ?? undefined,
    landlordName,
    landlordEmail: user.email,
    payUrl: stripeEnabled ? payUrl : undefined,
    notes: settings?.statementNotes ?? undefined,
  });

  try {
    await sendEmail({
      to: statement.tenant.email,
      subject: emailContent.subject,
      body: emailContent.text,
      html: emailContent.html,
      attachmentName: doc.fileName,
    });
  } catch (e) {
    console.error("[email] failed to send statement:", e);
  }

  await prisma.statement.update({
    where: { id: statementId },
    data: {
      status: "sent",
      emailSentAt: new Date(),
      pdfDocumentId: doc.id,
      payToken,
    },
  });

  return { payToken, payUrl };
}

export async function previewStatementEmail(statementId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true },
  });
  if (!user) throw new Error("User not found");

  const statement = await prisma.statement.findFirst({
    where: { id: statementId, unit: { property: { userId } } },
    include: {
      tenant: true,
      unit: { include: { property: true } },
    },
  });
  if (!statement) throw new Error("Statement not found");

  const settings = user.settings;
  const landlordName = settings?.landlordName || user.name || user.email;
  const monthLabel = `${MONTH_NAMES[statement.statementMonth - 1]} ${statement.statementYear}`;
  const propertyAddress = [
    statement.unit.property.addressLine1,
    statement.unit.property.city,
    statement.unit.property.province,
  ]
    .filter(Boolean)
    .join(", ");
  const stripeEnabled = settings?.stripePaymentsEnabled && isStripeConfigured();
  const payUrl = statement.payToken
    ? getStatementPayUrl(statement.payToken)
    : stripeEnabled
      ? getStatementPayUrl(createPayToken())
      : undefined;

  return buildStatementEmailContent({
    tenantName: statement.tenant.firstName,
    unitName: statement.unit.name,
    propertyName: statement.unit.property.name,
    propertyAddress,
    monthLabel,
    totalDue: formatMoney(statement.totalDueCents),
    dueDate: statement.dueDate.toLocaleDateString("en-CA"),
    paymentInstructions: settings?.paymentInstructions ?? undefined,
    landlordName,
    landlordEmail: user.email,
    payUrl,
    notes: settings?.statementNotes ?? undefined,
  });
}
