"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseMoneyToCents } from "@/lib/money";
import { requireProperty } from "@/lib/ownership";

export async function createMaintenanceAction(formData: FormData) {
  const user = await requireUser();
  const propertyId = String(formData.get("propertyId") || "");
  const unitId = String(formData.get("unitId") || "") || undefined;
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "general_repair");
  const vendorName = String(formData.get("vendorName") || "").trim() || undefined;
  const costCents = parseMoneyToCents(String(formData.get("cost") || "0"));
  const status = String(formData.get("status") || "planned");
  const description = String(formData.get("description") || "").trim() || undefined;
  const file = formData.get("file") as File | null;

  const property = await requireProperty(user.id, propertyId).catch(() => null);
  if (!property || !title) redirect("/maintenance/new?error=required");

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
      category: category as
        | "plumbing"
        | "electrical"
        | "hvac"
        | "appliance"
        | "roof"
        | "pest_control"
        | "cleaning"
        | "general_repair"
        | "other",
      vendorName,
      costCents: costCents || undefined,
      status: status as "planned" | "in_progress" | "completed" | "cancelled",
      description,
      maintenanceDate: new Date(),
      invoiceDocumentId,
    },
  });

  revalidatePath("/maintenance");
  redirect("/maintenance");
}
