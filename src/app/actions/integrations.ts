"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function updateIntegrationsAction(formData: FormData) {
  const user = await requireUser();
  const stripePaymentsEnabled = formData.get("stripePaymentsEnabled") === "on";
  const docusignEnabled = formData.get("docusignEnabled") === "on";

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      stripePaymentsEnabled,
      docusignEnabled,
    },
    update: {
      stripePaymentsEnabled,
      docusignEnabled,
    },
  });

  revalidatePath("/settings/integrations");
  revalidatePath("/settings");
  redirect("/settings/integrations?saved=1");
}
