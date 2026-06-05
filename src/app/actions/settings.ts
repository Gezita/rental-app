"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function updateSettingsAction(formData: FormData) {
  const user = await requireUser();
  const landlordName = String(formData.get("landlordName") || "").trim();
  const paymentInstructions = String(formData.get("paymentInstructions") || "").trim();
  const statementNotes = String(formData.get("statementNotes") || "").trim();
  const autoSendStatements = formData.get("autoSendStatements") === "on";
  const autoSendDayOfMonth = Math.min(
    28,
    Math.max(1, parseInt(String(formData.get("autoSendDayOfMonth") || "1"), 10))
  );
  const leaseReminderDays = Math.min(
    365,
    Math.max(7, parseInt(String(formData.get("leaseReminderDays") || "30"), 10))
  );
  const stripePaymentsEnabled = formData.get("stripePaymentsEnabled") === "on";

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      landlordName,
      paymentInstructions,
      statementNotes,
      autoSendStatements,
      autoSendDayOfMonth,
      leaseReminderDays,
      stripePaymentsEnabled,
    },
    update: {
      landlordName,
      paymentInstructions,
      statementNotes,
      autoSendStatements,
      autoSendDayOfMonth,
      leaseReminderDays,
      stripePaymentsEnabled,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?saved=1");
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim();

  await prisma.user.update({
    where: { id: user.id },
    data: { name: name || null },
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile?saved=1");
}
