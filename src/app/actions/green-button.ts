"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGreenButtonProvider } from "@/lib/green-button/providers";
import { requireGreenButtonConnection, requireProperty } from "@/lib/ownership";
import type { GreenButtonProvider } from "@prisma/client";

export async function connectGreenButtonManualAction(propertyId: string, formData: FormData) {
  const user = await requireUser();
  await requireProperty(user.id, propertyId);

  const provider = String(formData.get("provider") || "sandbox") as GreenButtonProvider;
  if (provider !== "sandbox" && process.env.GREEN_BUTTON_ALLOW_MANUAL_CONNECT !== "true") {
    throw new Error(
      "Manual connect is only available for sandbox unless GREEN_BUTTON_ALLOW_MANUAL_CONNECT=true"
    );
  }

  const config = getGreenButtonProvider(provider);
  if (!config) throw new Error("Provider is not configured");

  const accessToken = String(formData.get("accessToken") || "").trim();
  if (!accessToken) throw new Error("Access token is required");

  const subscriptionId = String(formData.get("subscriptionId") || "").trim() || undefined;
  const usagePointId = String(formData.get("usagePointId") || "").trim() || undefined;
  const resourceUri = String(formData.get("resourceUri") || "").trim() || undefined;

  const connection = await prisma.greenButtonConnection.upsert({
    where: {
      propertyId_provider_utilityType: {
        propertyId,
        provider,
        utilityType: config.utilityType,
      },
    },
    create: {
      propertyId,
      provider,
      utilityType: config.utilityType,
      status: "connected",
      accessToken,
      subscriptionId,
      usagePointId,
      resourceUri,
      accountLabel: "Manual connection",
    },
    update: {
      status: "connected",
      accessToken,
      subscriptionId,
      usagePointId,
      resourceUri,
      refreshToken: null,
      tokenExpiresAt: null,
      lastSyncError: null,
    },
  });

  const { syncGreenButtonConnection } = await import("@/lib/green-button/sync");
  const result = await syncGreenButtonConnection(connection.id);

  revalidatePath(`/properties/${propertyId}/utility-connect`);
  revalidatePath(`/properties/${propertyId}/utility-bills`);

  const params = new URLSearchParams({
    connected: provider,
    imported: String(result.imported),
    skipped: String(result.skipped),
  });
  if (result.errors.length > 0) params.set("error", result.errors[0]);

  redirect(`/properties/${propertyId}/utility-connect?${params.toString()}`);
}

export async function disconnectGreenButtonAction(connectionId: string) {
  const user = await requireUser();
  const connection = await requireGreenButtonConnection(user.id, connectionId);

  await prisma.greenButtonConnection.delete({ where: { id: connectionId } });

  revalidatePath(`/properties/${connection.propertyId}/utility-connect`);
  revalidatePath(`/properties/${connection.propertyId}`);
  redirect(`/properties/${connection.propertyId}/utility-connect?disconnected=1`);
}

export async function syncGreenButtonAction(connectionId: string) {
  const user = await requireUser();
  const connection = await requireGreenButtonConnection(user.id, connectionId);

  const { syncGreenButtonConnection } = await import("@/lib/green-button/sync");
  const result = await syncGreenButtonConnection(connectionId);

  revalidatePath(`/properties/${connection.propertyId}/utility-connect`);
  revalidatePath(`/properties/${connection.propertyId}/utility-bills`);

  const params = new URLSearchParams({
    synced: "1",
    imported: String(result.imported),
    skipped: String(result.skipped),
  });
  if (result.errors.length > 0) {
    params.set("error", result.errors[0]);
  }

  redirect(`/properties/${connection.propertyId}/utility-connect?${params.toString()}`);
}

export async function syncAllGreenButtonAction() {
  const user = await requireUser();
  const { syncGreenButtonConnectionsForUser, summarizeGreenButtonSync } = await import(
    "@/lib/green-button/sync"
  );
  const results = await syncGreenButtonConnectionsForUser(user.id);
  const summary = summarizeGreenButtonSync(results);

  revalidatePath("/settings");
  revalidatePath("/properties");

  const params = new URLSearchParams({
    greenButtonSync: "1",
    imported: String(summary.imported),
    skipped: String(summary.skipped),
    connections: String(summary.connections),
  });
  if (summary.errors.length > 0) {
    params.set("error", summary.errors[0]);
  }

  redirect(`/settings?${params.toString()}`);
}
