"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createLeaseSigningEnvelope, isDocuSignConfigured } from "@/lib/docusign";
import { readDocumentFile } from "@/lib/files";
import { requireUnit } from "@/lib/ownership";
import { parseValidDate } from "@/lib/validation";

export type LeaseDraftData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  moveInDate: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

export async function saveLeaseDraftAction(unitId: string, formData: FormData) {
  const user = await requireUser();
  await requireUnit(user.id, unitId);

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const moveInDate = parseValidDate(String(formData.get("moveInDate") || ""));
  const emergencyContactName = String(formData.get("emergencyContactName") || "").trim();
  const emergencyContactPhone = String(formData.get("emergencyContactPhone") || "").trim();
  const leaseStartDate = parseValidDate(String(formData.get("leaseStartDate") || ""));
  const leaseEndDate = parseValidDate(String(formData.get("leaseEndDate") || ""));

  await prisma.leaseDraft.upsert({
    where: { unitId },
    create: {
      unitId,
      firstName: firstName || null,
      lastName: lastName || null,
      email: email || null,
      phone: phone || null,
      moveInDate,
      emergencyContactName: emergencyContactName || null,
      emergencyContactPhone: emergencyContactPhone || null,
      leaseStartDate,
      leaseEndDate,
    },
    update: {
      firstName: firstName || null,
      lastName: lastName || null,
      email: email || null,
      phone: phone || null,
      moveInDate,
      emergencyContactName: emergencyContactName || null,
      emergencyContactPhone: emergencyContactPhone || null,
      leaseStartDate,
      leaseEndDate,
    },
  });

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { propertyId: true },
  });

  revalidatePath(`/properties/${unit?.propertyId}/units/${unitId}`);
  revalidatePath(`/properties/${unit?.propertyId}/units/${unitId}/lease/standard-lease`);
  redirect(`/properties/${unit?.propertyId}/units/${unitId}?saved=lease_draft`);
}

export async function sendLeaseForSignatureAction(documentId: string) {
  const user = await requireUser();

  const document = await prisma.document.findFirst({
    where: { id: documentId, userId: user.id, category: "lease" },
    include: {
      tenant: true,
      unit: { include: { property: true } },
    },
  });

  if (!document || !document.tenant || !document.unit) {
    redirect("/integrations?error=lease_not_found");
  }

  const settings = user.settings;
  if (!settings?.docusignEnabled) {
    redirect(
      `/properties/${document.propertyId}/units/${document.unitId}/lease/complete?documentId=${documentId}&error=docusign_disabled`
    );
  }

  if (!isDocuSignConfigured()) {
    redirect(
      `/properties/${document.propertyId}/units/${document.unitId}/lease/complete?documentId=${documentId}&error=docusign_not_configured`
    );
  }

  if (!document.tenant.email) {
    redirect(
      `/properties/${document.propertyId}/units/${document.unitId}/lease/complete?documentId=${documentId}&error=tenant_email`
    );
  }

  const pdfBytes = await readDocumentFile(document.filePath);
  const landlordName = settings.landlordName || user.name || user.email;

  const { envelopeId } = await createLeaseSigningEnvelope({
    documentId: document.id,
    documentName: document.fileName,
    pdfBytes,
    landlord: {
      name: landlordName,
      email: user.email,
      role: "landlord",
      routingOrder: 1,
    },
    tenant: {
      name: `${document.tenant.firstName} ${document.tenant.lastName}`,
      email: document.tenant.email,
      role: "tenant",
      routingOrder: 2,
    },
  });

  await prisma.document.update({
    where: { id: document.id },
    data: {
      docusignEnvelopeId: envelopeId,
      signatureStatus: "pending",
    },
  });

  revalidatePath(`/properties/${document.propertyId}/units/${document.unitId}`);
  revalidatePath("/documents");
  redirect(
    `/properties/${document.propertyId}/units/${document.unitId}/lease/complete?documentId=${documentId}&sent=1`
  );
}

export async function markLeaseSignedAction(documentId: string) {
  const user = await requireUser();

  const document = await prisma.document.findFirst({
    where: { id: documentId, userId: user.id, category: "lease" },
    include: { unit: true },
  });

  if (!document?.unitId || !document.propertyId) {
    redirect("/documents?error=not_found");
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      signatureStatus: "completed",
      signedAt: new Date(),
    },
  });

  revalidatePath(`/properties/${document.propertyId}/units/${document.unitId}`);
  revalidatePath("/documents");
  redirect(
    `/properties/${document.propertyId}/units/${document.unitId}/lease/complete?documentId=${documentId}&signed=1`
  );
}
