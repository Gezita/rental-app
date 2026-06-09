"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteDocumentFile } from "@/lib/files";

async function detachDocumentReferences(documentId: string) {
  await prisma.$transaction([
    prisma.lease.updateMany({
      where: { documentId },
      data: { documentId: null },
    }),
    prisma.utilityBill.updateMany({
      where: { documentId },
      data: { documentId: null },
    }),
    prisma.statement.updateMany({
      where: { pdfDocumentId: documentId },
      data: { pdfDocumentId: null },
    }),
    prisma.receipt.updateMany({
      where: { pdfDocumentId: documentId },
      data: { pdfDocumentId: null },
    }),
    prisma.maintenanceRecord.updateMany({
      where: { invoiceDocumentId: documentId },
      data: { invoiceDocumentId: null },
    }),
    prisma.inspectionItemPhoto.deleteMany({
      where: { documentId },
    }),
  ]);
}

async function removeOwnedDocument(userId: string, documentId: string) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
  });
  if (!document) return false;

  await detachDocumentReferences(documentId);
  await deleteDocumentFile(document.filePath);
  await prisma.document.delete({ where: { id: documentId } });
  return true;
}

export async function deleteDocumentAction(documentId: string) {
  const user = await requireUser();
  const removed = await removeOwnedDocument(user.id, documentId);
  if (!removed) {
    redirect("/documents?error=not_found");
  }

  revalidatePath("/documents");
  redirect("/documents?deleted=1");
}

export async function deleteDocumentsAction(formData: FormData) {
  const user = await requireUser();
  const ids = formData.getAll("documentIds").map(String).filter(Boolean);
  if (ids.length === 0) {
    redirect("/documents?error=none_selected");
  }

  let removed = 0;
  for (const id of ids) {
    if (await removeOwnedDocument(user.id, id)) removed += 1;
  }

  revalidatePath("/documents");
  redirect(`/documents?deleted=${removed}`);
}

export async function uploadDocumentAction(formData: FormData) {
  const user = await requireUser();
  const propertyId = String(formData.get("propertyId") || "") || undefined;
  const unitId = String(formData.get("unitId") || "") || undefined;
  const category = String(formData.get("category") || "other");
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) redirect("/documents?error=file");

  const { saveUploadedFile } = await import("@/lib/files");
  await saveUploadedFile(file, {
    userId: user.id,
    category: category as
      | "lease"
      | "utility_bill"
      | "statement"
      | "receipt"
      | "maintenance_invoice"
      | "notice"
      | "photo"
      | "other",
    propertyId,
    unitId,
  });

  revalidatePath("/documents");
  redirect("/documents?uploaded=1");
}

export async function uploadLeaseAction(unitId: string, formData: FormData) {
  const user = await requireUser();
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { userId: user.id } },
    include: { tenants: { where: { isActive: true } } },
  });
  if (!unit) throw new Error("Unit not found");

  const file = formData.get("file") as File | null;
  const leaseEndDateStr = String(formData.get("leaseEndDate") || "").trim();
  const leaseEndDate = leaseEndDateStr ? new Date(leaseEndDateStr) : undefined;

  if (!file || file.size === 0) {
    redirect(`/properties/${unit.propertyId}/units/${unitId}?error=lease`);
  }

  const tenant = unit.tenants[0];
  const { saveUploadedFile } = await import("@/lib/files");
  const doc = await saveUploadedFile(file, {
    userId: user.id,
    category: "lease",
    propertyId: unit.propertyId,
    unitId: unit.id,
    tenantId: tenant?.id,
  });

  if (tenant) {
    await prisma.lease.create({
      data: {
        unitId: unit.id,
        tenantId: tenant.id,
        documentId: doc.id,
        leaseStartDate: tenant.moveInDate || new Date(),
        leaseEndDate,
        rentAmountCents: unit.rentAmountCents,
        rentDueDay: unit.rentDueDay,
        status: "active",
      },
    });
  }

  revalidatePath(`/properties/${unit.propertyId}/units/${unitId}`);
  revalidatePath("/documents");
  redirect(`/properties/${unit.propertyId}/units/${unitId}?saved=lease`);
}
