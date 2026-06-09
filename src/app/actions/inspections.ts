"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_INSPECTION_CHECKLIST } from "@/lib/inspection-checklist";
import { requireProperty, requireUnit } from "@/lib/ownership";

function revalidateInspectionPaths(inspectionId: string) {
  revalidatePath("/inspections");
  revalidatePath(`/inspections/${inspectionId}`);
}

export async function createInspectionAction(formData: FormData) {
  const user = await requireUser();
  const propertyId = String(formData.get("propertyId") || "");
  const unitId = String(formData.get("unitId") || "") || undefined;
  const title = String(formData.get("title") || "").trim() || "Property inspection";

  if (!propertyId) {
    redirect("/inspections/new?error=property");
  }

  await requireProperty(user.id, propertyId);
  if (unitId) {
    const unit = await requireUnit(user.id, unitId);
    if (unit.propertyId !== propertyId) {
      redirect("/inspections/new?error=unit");
    }
  }

  const inspection = await prisma.inspection.create({
    data: {
      propertyId,
      unitId,
      title,
      items: {
        create: DEFAULT_INSPECTION_CHECKLIST.map((label, index) => ({
          label,
          sortOrder: index,
        })),
      },
    },
  });

  revalidatePath("/inspections");
  redirect(`/inspections/${inspection.id}`);
}

export async function saveInspectionAction(inspectionId: string, formData: FormData) {
  const user = await requireUser();

  const inspection = await prisma.inspection.findFirst({
    where: {
      id: inspectionId,
      property: { userId: user.id },
    },
    include: { items: true },
  });

  if (!inspection) {
    redirect("/inspections?error=not_found");
  }

  const overallNotes = String(formData.get("overallNotes") || "").trim() || null;
  const complete = formData.get("complete") === "1";

  await prisma.$transaction(
    inspection.items.map((item) => {
      const status = String(formData.get(`status-${item.id}`) || item.status);
      const notes = String(formData.get(`notes-${item.id}`) || "").trim() || null;
      const validStatus = ["pending", "pass", "fail", "na"].includes(status)
        ? (status as "pending" | "pass" | "fail" | "na")
        : item.status;

      return prisma.inspectionItem.update({
        where: { id: item.id },
        data: { status: validStatus, notes },
      });
    })
  );

  await prisma.inspection.update({
    where: { id: inspectionId },
    data: {
      overallNotes,
      status: complete ? "completed" : "in_progress",
      completedAt: complete ? new Date() : null,
    },
  });

  revalidateInspectionPaths(inspectionId);

  if (complete) {
    redirect(`/inspections/${inspectionId}?saved=1`);
  }

  redirect(`/inspections/${inspectionId}?updated=1`);
}

export async function uploadInspectionItemPhotoAction(formData: FormData) {
  const user = await requireUser();
  const inspectionItemId = String(formData.get("inspectionItemId") || "");
  const file = formData.get("file") as File | null;

  if (!inspectionItemId || !file || file.size === 0) {
    redirect("/inspections?error=photo");
  }

  const item = await prisma.inspectionItem.findFirst({
    where: {
      id: inspectionItemId,
      inspection: { property: { userId: user.id } },
    },
    include: {
      inspection: { include: { property: true, unit: true } },
    },
  });

  if (!item) {
    redirect("/inspections?error=not_found");
  }

  const { saveUploadedFile } = await import("@/lib/files");
  const doc = await saveUploadedFile(file, {
    userId: user.id,
    category: "photo",
    propertyId: item.inspection.propertyId,
    unitId: item.inspection.unitId ?? undefined,
    notes: `Inspection: ${item.label}`,
  });

  await prisma.inspectionItemPhoto.create({
    data: {
      inspectionItemId: item.id,
      documentId: doc.id,
    },
  });

  revalidateInspectionPaths(item.inspectionId);
  redirect(`/inspections/${item.inspectionId}?photo=1`);
}

export async function deleteInspectionAction(inspectionId: string, formData: FormData) {
  const user = await requireUser();
  const confirm = String(formData.get("confirm") || "").trim();

  const inspection = await prisma.inspection.findFirst({
    where: { id: inspectionId, property: { userId: user.id } },
    include: {
      items: { include: { photos: { include: { document: true } } } },
    },
  });

  if (!inspection) {
    redirect("/inspections?error=not_found");
  }

  if (confirm !== inspection.title) {
    redirect(`/inspections/${inspectionId}?error=delete_confirm`);
  }

  const { deleteDocumentFile } = await import("@/lib/files");
  for (const item of inspection.items) {
    for (const photo of item.photos) {
      await deleteDocumentFile(photo.document.filePath);
      await prisma.document.delete({ where: { id: photo.documentId } });
    }
  }

  await prisma.inspection.delete({ where: { id: inspectionId } });

  revalidatePath("/inspections");
  redirect("/inspections?deleted=1");
}
