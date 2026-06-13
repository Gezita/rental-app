"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/server/emails/send";
import { getLtbForm } from "@/lib/ltb-forms";
import { formatMoney, parseMoneyToCents } from "@/lib/money";
import { requireProperty } from "@/lib/ownership";
import {
  buildAnnouncementEmailContent,
  buildLtbNoticeEmailContent,
} from "@/lib/tenant-communications";
import { getLtbNoticeWizardFields, resolveLtbNoticeForm } from "@/lib/ltb-notice-wizard";
import { parseValidDate } from "@/lib/validation";
import { requireUnit } from "@/lib/ownership";
import { zOptionalString, zRequiredString } from "@/lib/validation";

// ── Schemas ──────────────────────────────────────────────────────────────────

const generateLtbNoticeSchema = z.object({
  propertyId: zRequiredString,
  unitId: zRequiredString,
  tenantId: zRequiredString,
  formCode: z.string().trim().min(1, "Form code is required").transform((v) => v.toUpperCase()),
  notes: zOptionalString,
});

const sendAnnouncementSchema = z.object({
  subject: zRequiredString,
  message: zRequiredString,
  propertyId: zOptionalString,
});

// ── Actions ───────────────────────────────────────────────────────────────────

export async function generateLtbNoticeAction(formData: FormData) {
  const user = await requireUser();

  const parsed = generateLtbNoticeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/documents/notices/wizard?error=required");

  const { propertyId, unitId, tenantId, formCode, notes } = parsed.data;

  const form = resolveLtbNoticeForm(formCode);
  if (!form) {
    redirect(`/documents/notices/wizard?error=invalid_form&formCode=${formCode}`);
  }

  await requireProperty(user.id, propertyId);
  const unit = await requireUnit(user.id, unitId);
  if (unit.propertyId !== propertyId) {
    redirect("/documents/notices/wizard?error=required");
  }

  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, unitId, isActive: true },
  });
  if (!tenant) {
    redirect("/documents/notices/wizard?error=tenant");
  }

  const fieldValues: Record<string, string> = {};
  for (const field of getLtbNoticeWizardFields(formCode)) {
    const value = String(formData.get(field.name) || "").trim();
    if (field.required && !value) {
      redirect(
        `/documents/notices/wizard?error=required&formCode=${formCode}&tenantId=${tenantId}&propertyId=${propertyId}&unitId=${unitId}`
      );
    }
    if (value) fieldValues[field.name] = value;
  }

  const serviceDate = parseValidDate(fieldValues.serviceDate) ?? new Date();
  const terminationDate = fieldValues.terminationDate
    ? parseValidDate(fieldValues.terminationDate) ?? undefined
    : undefined;
  const effectiveDate = fieldValues.effectiveDate
    ? parseValidDate(fieldValues.effectiveDate) ?? undefined
    : undefined;

  const settings = user.settings;
  const landlordName = settings?.landlordName || user.name || user.email;
  const property = unit.property;
  const propertyAddress = [
    property.addressLine1,
    property.addressLine2,
    property.city,
    property.province,
    property.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const { generateLtbNoticePdf } = await import("@/lib/pdf");
  const doc = await generateLtbNoticePdf({
    userId: user.id,
    propertyId,
    unitId,
    tenantId,
    formCode: form.code,
    formName: form.name,
    landlordName,
    landlordEmail: user.email,
    tenantName: `${tenant.firstName} ${tenant.lastName}`,
    tenantEmail: tenant.email ?? undefined,
    tenantPhone: tenant.phone ?? undefined,
    propertyName: property.name,
    propertyAddress,
    unitName: unit.name,
    serviceDate,
    effectiveDate,
    terminationDate,
    fieldValues,
    notes,
  });

  await prisma.document.update({
    where: { id: doc.id },
    data: { ltbFormCode: form.code },
  });

  revalidatePath("/documents/notices");
  revalidatePath("/documents");
  redirect(`/documents/notices/wizard/complete?documentId=${doc.id}`);
}

export async function uploadLtbNoticeAction(formData: FormData) {
  const user = await requireUser();
  const propertyId = String(formData.get("propertyId") || "").trim();
  const unitId = String(formData.get("unitId") || "").trim() || undefined;
  const tenantId = String(formData.get("tenantId") || "").trim() || undefined;
  const formCode = String(formData.get("formCode") || "").trim().toUpperCase();
  const effectiveDate = String(formData.get("effectiveDate") || "").trim() || undefined;
  const notes = String(formData.get("notes") || "").trim() || undefined;
  const file = formData.get("file") as File | null;

  if (!propertyId || !formCode || !file || file.size === 0) {
    redirect("/documents/notices?error=required");
  }

  if (!getLtbForm(formCode)) {
    redirect("/documents/notices?error=invalid_form");
  }

  await requireProperty(user.id, propertyId);

  const { saveUploadedFile } = await import("@/lib/files");
  const doc = await saveUploadedFile(file, {
    userId: user.id,
    category: "ltb_notice",
    propertyId,
    unitId,
    tenantId,
    notes: effectiveDate
      ? `Effective date: ${effectiveDate}${notes ? ` — ${notes}` : ""}`
      : notes,
  });

  await prisma.document.update({
    where: { id: doc.id },
    data: { ltbFormCode: formCode },
  });

  revalidatePath("/documents/notices");
  redirect(`/documents/notices?uploaded=1&documentId=${doc.id}`);
}

export async function sendLtbNoticeEmailAction(formData: FormData) {
  const user = await requireUser();
  const documentId = String(formData.get("documentId") || "");
  const customMessage = String(formData.get("customMessage") || "").trim() || undefined;
  const effectiveDate = String(formData.get("effectiveDate") || "").trim() || undefined;

  const document = await prisma.document.findFirst({
    where: { id: documentId, userId: user.id, category: "ltb_notice" },
    include: { property: true, unit: true, tenant: true },
  });

  if (!document) throw new Error("Notice document not found");
  if (!document.tenant?.email) throw new Error("Tenant email is required");

  const form = getLtbForm(document.ltbFormCode || "");
  if (!form) throw new Error("LTB form code is missing or invalid");

  const landlordName = user.settings?.landlordName || user.name || user.email;
  const propertyAddress = [
    document.property?.addressLine1,
    document.property?.city,
    document.property?.province,
  ]
    .filter(Boolean)
    .join(", ");

  const emailContent = buildLtbNoticeEmailContent({
    tenantName: document.tenant.firstName,
    formCode: form.code,
    formName: form.name,
    propertyName: document.property?.name || "Property",
    unitName: document.unit?.name || "Unit",
    propertyAddress: propertyAddress || "—",
    effectiveDate,
    customMessage,
    landlordName,
    landlordEmail: user.email,
  });

  await sendEmail({
    to: document.tenant.email,
    subject: emailContent.subject,
    body: emailContent.text,
    html: emailContent.html,
    attachmentName: document.fileName,
  });

  await prisma.document.update({
    where: { id: document.id },
    data: { sentToTenantAt: new Date() },
  });

  revalidatePath("/documents/notices");
  redirect("/documents/notices?sent=1");
}

export async function sendAnnouncementEmailAction(formData: FormData) {
  const user = await requireUser();

  const parsed = sendAnnouncementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/documents/notices?error=announcement_required");

  const { subject: subjectLine, message, propertyId } = parsed.data;
  const tenantIds = formData.getAll("tenantIds").map(String).filter(Boolean);

  let tenants;
  if (tenantIds.length > 0) {
    tenants = await prisma.tenant.findMany({
      where: {
        id: { in: tenantIds },
        isActive: true,
        unit: { property: { userId: user.id } },
      },
      include: { unit: { include: { property: true } } },
    });
  } else if (propertyId) {
    await requireProperty(user.id, propertyId);
    tenants = await prisma.tenant.findMany({
      where: { isActive: true, unit: { propertyId, property: { userId: user.id } } },
      include: { unit: { include: { property: true } } },
    });
  } else {
    tenants = await prisma.tenant.findMany({
      where: { isActive: true, unit: { property: { userId: user.id } } },
      include: { unit: { include: { property: true } } },
    });
  }

  const recipients = tenants.filter((t) => t.email);
  if (recipients.length === 0) {
    redirect("/documents/notices?error=no_email");
  }

  const landlordName = user.settings?.landlordName || user.name || user.email;

  for (const tenant of recipients) {
    const emailContent = buildAnnouncementEmailContent({
      tenantName: tenant.firstName,
      subjectLine,
      propertyName: tenant.unit.property.name,
      unitName: tenant.unit.name,
      message,
      landlordName,
      landlordEmail: user.email,
    });

    await sendEmail({
      to: tenant.email!,
      subject: emailContent.subject,
      body: emailContent.text,
      html: emailContent.html,
    });
  }

  revalidatePath("/documents/notices");
  redirect(`/documents/notices?announcementSent=${recipients.length}`);
}

export async function uploadMaintenanceReceiptAction(formData: FormData) {
  const user = await requireUser();
  const propertyId = String(formData.get("propertyId") || "");
  const unitId = String(formData.get("unitId") || "") || undefined;
  const maintenanceRecordId = String(formData.get("maintenanceRecordId") || "") || undefined;
  const vendorName = String(formData.get("vendorName") || "").trim() || undefined;
  const amount = String(formData.get("amount") || "").trim();
  const receiptDate = String(formData.get("receiptDate") || "").trim() || undefined;
  const notes = String(formData.get("notes") || "").trim() || undefined;
  const file = formData.get("file") as File | null;

  if (!propertyId || !file || file.size === 0) {
    redirect("/maintenance/receipts?error=required");
  }

  await requireProperty(user.id, propertyId);

  const { saveUploadedFile } = await import("@/lib/files");
  const amountCents = amount ? parseMoneyToCents(amount) : undefined;
  const doc = await saveUploadedFile(file, {
    userId: user.id,
    category: "maintenance_receipt",
    propertyId,
    unitId,
    notes: [
      vendorName ? `Vendor: ${vendorName}` : "",
      amountCents ? `Amount: ${formatMoney(amountCents)}` : "",
      receiptDate ? `Date: ${receiptDate}` : "",
      notes || "",
    ]
      .filter(Boolean)
      .join(" · "),
  });

  if (maintenanceRecordId) {
    const record = await prisma.maintenanceRecord.findFirst({
      where: { id: maintenanceRecordId, property: { userId: user.id } },
    });
    if (record && !record.invoiceDocumentId) {
      await prisma.maintenanceRecord.update({
        where: { id: record.id },
        data: { invoiceDocumentId: doc.id },
      });
    }
  }

  revalidatePath("/maintenance/receipts");
  revalidatePath("/maintenance");
  redirect("/maintenance/receipts?uploaded=1");
}
