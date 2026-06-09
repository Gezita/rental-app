"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { zCheckbox, zOptionalString } from "@/lib/validation";

// ── Schemas ──────────────────────────────────────────────────────────────────

const updateSettingsSchema = z.object({
  landlordName: z.string().trim().min(1, "Landlord name is required"),
  paymentInstructions: zOptionalString,
  statementNotes: zOptionalString,
  autoSendStatements: zCheckbox,
  autoSendDayOfMonth: z.preprocess(
    (v) => parseInt(String(v ?? 1), 10),
    z.number().int().transform((n) => Math.min(28, Math.max(1, n)))
  ),
  leaseReminderDays: z.preprocess(
    (v) => parseInt(String(v ?? 30), 10),
    z.number().int().transform((n) => Math.min(365, Math.max(7, n)))
  ),
  stripePaymentsEnabled: zCheckbox,
});

const updateProfileSchema = z.object({
  name: zOptionalString,
});

// ── Actions ───────────────────────────────────────────────────────────────────

export async function updateSettingsAction(formData: FormData) {
  const user = await requireUser();

  const parsed = updateSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/settings?error=invalid");

  const {
    landlordName,
    paymentInstructions,
    statementNotes,
    autoSendStatements,
    autoSendDayOfMonth,
    leaseReminderDays,
    stripePaymentsEnabled,
  } = parsed.data;

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      landlordName,
      paymentInstructions: paymentInstructions ?? "",
      statementNotes: statementNotes ?? "",
      autoSendStatements,
      autoSendDayOfMonth,
      leaseReminderDays,
      stripePaymentsEnabled,
    },
    update: {
      landlordName,
      paymentInstructions: paymentInstructions ?? "",
      statementNotes: statementNotes ?? "",
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

  const parsed = updateProfileSchema.safeParse(Object.fromEntries(formData));
  const name = parsed.success ? parsed.data.name : undefined;

  await prisma.user.update({
    where: { id: user.id },
    data: { name: name ?? null },
  });

  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
  redirect("/settings/profile?saved=1");
}
