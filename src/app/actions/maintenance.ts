"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireProperty } from "@/lib/ownership";
import { zOptionalCents, zOptionalString, zRequiredString } from "@/lib/validation";

// ── Schemas ──────────────────────────────────────────────────────────────────

const createMaintenanceSchema = z.object({
  propertyId: zRequiredString,
  unitId: zOptionalString,
  title: zRequiredString,
  category: z.preprocess(
    (v) => (typeof v === "string" && v ? v : "general_repair"),
    z.enum(["plumbing", "electrical", "hvac", "appliance", "roof", "pest_control", "cleaning", "general_repair", "other"])
  ),
  status: z.preprocess(
    (v) => (typeof v === "string" && v ? v : "planned"),
    z.enum(["planned", "in_progress", "completed", "cancelled"])
  ),
  vendorName: zOptionalString,
  cost: zOptionalCents,
  description: zOptionalString,
});

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createMaintenanceAction(formData: FormData) {
  const user = await requireUser();

  const parsed = createMaintenanceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/maintenance/new?error=required");

  const { propertyId, unitId, title, category, status, vendorName, cost: costCents, description } =
    parsed.data;

  const property = await requireProperty(user.id, propertyId).catch(() => null);
  if (!property) redirect("/maintenance/new?error=required");

  const file = formData.get("file") as File | null;
  let invoiceDocumentId: string | undefined;

  if (file && file.size > 0) {
    const { saveUploadedFile } = await import("@/lib/files");
    const doc = await saveUploadedFile(file, {
      userId: user.id,
      category: "maintenance_invoice",
      propertyId,
      unitId,
    });
    invoiceDocumentId = doc.id;
  }

  await prisma.maintenanceRecord.create({
    data: {
      propertyId,
      unitId,
      title,
      category,
      vendorName,
      costCents: costCents || undefined,
      status,
      description,
      maintenanceDate: new Date(),
      invoiceDocumentId,
    },
  });

  revalidatePath("/maintenance");
  redirect("/maintenance");
}
