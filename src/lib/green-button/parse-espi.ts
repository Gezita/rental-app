export type ParsedUsageSummary = {
  externalId: string;
  title?: string;
  amountCents: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  subscriptionId?: string;
  usagePointId?: string;
};

const ESPI_AMOUNT_DIVISOR = 1000;

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function readTag(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tag}>`, "i"));
  return match ? decodeXmlEntities(match[1].trim()) : undefined;
}

function readSelfHref(entry: string): string | undefined {
  const match = entry.match(
    /<link[^>]+rel=["']self["'][^>]+href=["']([^"']+)["']/i
  );
  if (match) return match[1];
  const alt = entry.match(/href=["']([^"']+)["'][^>]+rel=["']self["']/i);
  return alt?.[1];
}

function espiAmountToCents(raw: string | undefined): number | null {
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return null;
  return Math.round(value / ESPI_AMOUNT_DIVISOR);
}

function parseBillingPeriod(summaryBlock: string): { start: Date; end: Date } | null {
  const billingBlock =
    summaryBlock.match(/<(?:[\w-]+:)?billingPeriod[\s\S]*?<\/(?:[\w-]+:)?billingPeriod>/i)?.[0] ||
    summaryBlock.match(/<(?:[\w-]+:)?summaryInterval[\s\S]*?<\/(?:[\w-]+:)?summaryInterval>/i)?.[0];

  if (!billingBlock) return null;

  const startRaw = readTag(billingBlock, "start");
  const durationRaw = readTag(billingBlock, "duration");
  if (!startRaw || !durationRaw) return null;

  const startSeconds = Number.parseInt(startRaw, 10);
  const durationSeconds = Number.parseInt(durationRaw, 10);
  if (!Number.isFinite(startSeconds) || !Number.isFinite(durationSeconds)) return null;

  const start = new Date(startSeconds * 1000);
  const end = new Date((startSeconds + durationSeconds) * 1000);
  return { start, end };
}

function parseSummaryEntry(entry: string): ParsedUsageSummary | null {
  const summaryMatch = entry.match(
    /<(?:[\w-]+:)?(?:UsageSummary|ElectricPowerUsageSummary)[\s\S]*?<\/(?:[\w-]+:)?(?:UsageSummary|ElectricPowerUsageSummary)>/i
  );
  if (!summaryMatch) return null;

  const summaryBlock = summaryMatch[0];
  const selfHref = readSelfHref(entry);
  if (!selfHref) return null;

  const amountCents =
    espiAmountToCents(readTag(summaryBlock, "costAdditionalLastPeriod")) ??
    espiAmountToCents(readTag(summaryBlock, "billLastPeriod")) ??
    espiAmountToCents(readTag(summaryBlock, "billToDate"));

  if (amountCents === null || amountCents <= 0) return null;

  const billingPeriod = parseBillingPeriod(summaryBlock);
  if (!billingPeriod) return null;

  const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const ids = extractIdsFromHref(selfHref);

  return {
    externalId: selfHref,
    title: titleMatch ? decodeXmlEntities(titleMatch[1].trim()) : undefined,
    amountCents,
    billingPeriodStart: billingPeriod.start,
    billingPeriodEnd: billingPeriod.end,
    subscriptionId: ids.subscriptionId,
    usagePointId: ids.usagePointId,
  };
}

function extractIdsFromHref(href: string): {
  subscriptionId?: string;
  usagePointId?: string;
} {
  const subscriptionMatch = href.match(/Subscription\/([^/]+)/i);
  const usagePointMatch = href.match(/UsagePoint\/([^/]+)/i);
  return {
    subscriptionId: subscriptionMatch?.[1],
    usagePointId: usagePointMatch?.[1],
  };
}

export function parseUsageSummariesFromFeed(xml: string): ParsedUsageSummary[] {
  const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  const summaries: ParsedUsageSummary[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const parsed = parseSummaryEntry(entry);
    if (!parsed || seen.has(parsed.externalId)) continue;
    seen.add(parsed.externalId);
    summaries.push(parsed);
  }

  return summaries.sort(
    (a, b) => b.billingPeriodStart.getTime() - a.billingPeriodStart.getTime()
  );
}

export function extractAtomLink(xml: string, rel: string): string | undefined {
  const pattern = new RegExp(
    `<link[^>]+rel=["']${rel}["'][^>]+href=["']([^"']+)["']`,
    "i"
  );
  const match = xml.match(pattern);
  if (match) return match[1];

  const alt = new RegExp(`href=["']([^"']+)["'][^>]+rel=["']${rel}["']`, "i");
  return xml.match(alt)?.[1];
}

export function extractResourceUrisFromTokenBody(body: Record<string, unknown>): string[] {
  const uris: string[] = [];
  const candidates = [
    body.resourceURI,
    body.resource_uri,
    body.subscriptionURI,
    body.subscription_uri,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) uris.push(value.trim());
  }

  return uris;
}
