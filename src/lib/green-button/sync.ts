import { prisma } from "@/lib/db";
import { calculateUtilitySplits } from "@/lib/statements";
import { GreenButtonClient } from "@/lib/green-button/client";
import { getGreenButtonProvider } from "@/lib/green-button/providers";

export type GreenButtonSyncResult = {
  connectionId: string;
  imported: number;
  skipped: number;
  errors: string[];
};

const PROVIDER_LABELS: Record<string, string> = {
  sandbox: "Green Button Sandbox",
  enbridge: "Enbridge Gas",
  alectra: "Alectra Utilities",
};

export async function syncGreenButtonConnection(
  connectionId: string
): Promise<GreenButtonSyncResult> {
  const result: GreenButtonSyncResult = {
    connectionId,
    imported: 0,
    skipped: 0,
    errors: [],
  };

  const connection = await prisma.greenButtonConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    result.errors.push("Connection not found");
    return result;
  }

  if (connection.status !== "connected" || !connection.accessToken) {
    result.errors.push("Connection is not active");
    return result;
  }

  const config = getGreenButtonProvider(connection.provider);
  if (!config) {
    result.errors.push("Provider is not configured");
    return result;
  }

  const client = GreenButtonClient.forConnection(connection);
  if (!client) {
    result.errors.push("Unable to initialize Green Button client");
    return result;
  }

  try {
    const discovered = await client.discoverSubscriptionAndUsagePoint();
    if (
      discovered.subscriptionId !== connection.subscriptionId ||
      discovered.usagePointId !== connection.usagePointId ||
      discovered.accountLabel !== connection.accountLabel
    ) {
      await prisma.greenButtonConnection.update({
        where: { id: connection.id },
        data: {
          subscriptionId: discovered.subscriptionId ?? connection.subscriptionId,
          usagePointId: discovered.usagePointId ?? connection.usagePointId,
          accountLabel: discovered.accountLabel ?? connection.accountLabel,
        },
      });
    }

    const summaries = await client.fetchUsageSummaries();
    const providerName = PROVIDER_LABELS[connection.provider] ?? connection.provider;

    for (const summary of summaries) {
      const existing = await prisma.utilityBill.findFirst({
        where: {
          greenButtonConnectionId: connection.id,
          greenButtonExternalId: summary.externalId,
        },
      });

      if (existing) {
        result.skipped += 1;
        continue;
      }

      const bill = await prisma.utilityBill.create({
        data: {
          propertyId: connection.propertyId,
          utilityType: connection.utilityType,
          providerName,
          amountCents: summary.amountCents,
          billingPeriodStart: summary.billingPeriodStart,
          billingPeriodEnd: summary.billingPeriodEnd,
          source: "green_button",
          greenButtonExternalId: summary.externalId,
          greenButtonConnectionId: connection.id,
          notes: summary.title ? `Imported via Green Button — ${summary.title}` : "Imported via Green Button",
        },
      });

      await calculateUtilitySplits(bill.id, connection.propertyId);
      result.imported += 1;
    }

    await prisma.greenButtonConnection.update({
      where: { id: connection.id },
      data: {
        status: "connected",
        lastSyncedAt: new Date(),
        lastSyncError: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    result.errors.push(message);

    await prisma.greenButtonConnection.update({
      where: { id: connection.id },
      data: {
        status: "error",
        lastSyncError: message,
      },
    });
  }

  return result;
}

export async function syncGreenButtonConnectionsForUser(userId: string) {
  const connections = await prisma.greenButtonConnection.findMany({
    where: {
      status: "connected",
      property: { userId },
    },
  });

  const results: GreenButtonSyncResult[] = [];
  for (const connection of connections) {
    results.push(await syncGreenButtonConnection(connection.id));
  }
  return results;
}

export async function syncAllEnabledGreenButtonConnections() {
  const connections = await prisma.greenButtonConnection.findMany({
    where: {
      status: "connected",
      property: {
        user: {
          settings: {
            utilityAutomationEnabled: true,
          },
        },
      },
    },
  });

  const results: GreenButtonSyncResult[] = [];
  for (const connection of connections) {
    results.push(await syncGreenButtonConnection(connection.id));
  }
  return results;
}

export function summarizeGreenButtonSync(results: GreenButtonSyncResult[]) {
  return {
    connections: results.length,
    imported: results.reduce((sum, item) => sum + item.imported, 0),
    skipped: results.reduce((sum, item) => sum + item.skipped, 0),
    errors: results.flatMap((item) => item.errors),
  };
}
