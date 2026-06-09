import Link from "next/link";
import { notFound } from "next/navigation";
import {
  markLeaseSignedAction,
  sendLeaseForSignatureAction,
} from "@/app/actions/lease-signing";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isDocuSignConfigured } from "@/lib/docusign";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { FlashAlert } from "@/components/flash-alert";
import { SubmitButton } from "@/components/submit-button";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export default async function LeaseCompletePage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string; unitId: string }>;
  searchParams: Promise<{
    documentId?: string;
    sent?: string;
    signed?: string;
    error?: string;
  }>;
}) {
  const { propertyId, unitId } = await params;
  const query = await searchParams;
  const user = await requireUser();

  if (!query.documentId) notFound();

  const document = await prisma.document.findFirst({
    where: {
      id: query.documentId,
      userId: user.id,
      unitId,
      propertyId,
      category: "lease",
    },
    include: {
      tenant: true,
      unit: { include: { property: true } },
    },
  });

  if (!document) notFound();

  const settings = user.settings;
  const docusignReady = Boolean(settings?.docusignEnabled && isDocuSignConfigured());
  const sendForSignature = sendLeaseForSignatureAction.bind(null, document.id);
  const markSigned = markLeaseSignedAction.bind(null, document.id);

  const signatureLabel =
    document.signatureStatus === "completed"
      ? "Signed"
      : document.signatureStatus === "pending"
        ? "Awaiting signatures"
        : "Not sent for signature";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageBackNav
        parent={{
          href: `/properties/${propertyId}/units/${unitId}`,
          label: `${document.unit?.property.name} · ${document.unit?.name}`,
        }}
      />

      <div>
        <h1 className="text-2xl font-bold">Lease ready</h1>
        <p className="text-muted">
          Your Ontario Standard Lease draft is saved. Download it, send for e-signature, or upload a
          signed copy later.
        </p>
      </div>

      {query.sent && (
        <FlashAlert clearParams={["sent"]}>
          DocuSign envelope created — landlord and tenant will receive signing emails when API
          credentials are fully configured.
        </FlashAlert>
      )}
      {query.signed && (
        <FlashAlert clearParams={["signed"]}>Lease marked as fully signed.</FlashAlert>
      )}
      {query.error === "docusign_disabled" && (
        <FlashAlert variant="warning" clearParams={["error"]}>
          Enable DocuSign under{" "}
          <Link href="/settings/integrations" className="font-medium underline">
            Integrations
          </Link>{" "}
          first.
        </FlashAlert>
      )}
      {query.error === "docusign_not_configured" && (
        <FlashAlert variant="warning" clearParams={["error"]}>
          DocuSign API credentials are missing from your environment. See{" "}
          <Link href="/settings/integrations" className="font-medium underline">
            Integrations
          </Link>
          .
        </FlashAlert>
      )}
      {query.error === "tenant_email" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Add the tenant&apos;s email on the unit page before sending for signature.
        </FlashAlert>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{document.fileName}</CardTitle>
              <CardDescription>
                {document.tenant
                  ? `${document.tenant.firstName} ${document.tenant.lastName}`
                  : "Tenant"}{" "}
                · {document.unit?.property.name} / {document.unit?.name}
              </CardDescription>
            </div>
            <Badge
              variant={
                document.signatureStatus === "completed"
                  ? "success"
                  : document.signatureStatus === "pending"
                    ? "warning"
                    : "secondary"
              }
            >
              {signatureLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <ButtonLink href={`/api/documents/${document.id}`} target="_blank">
            Download PDF
          </ButtonLink>
          <Link href={`/properties/${propertyId}/units/${unitId}`}>
            <Button variant="outline">Back to unit</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>DocuSign e-signature</CardTitle>
          <CardDescription>
            Send to landlord first, then tenant. When both sign, the lease shows as signed on this
            unit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {document.signatureStatus === "completed" ? (
            <p className="text-sm text-muted">
              This lease is marked complete
              {document.signedAt
                ? ` on ${document.signedAt.toLocaleDateString("en-CA")}`
                : ""}
              . View it on the unit page or in Documents.
            </p>
          ) : document.signatureStatus === "pending" ? (
            <>
              <p className="text-sm text-muted">
                Envelope {document.docusignEnvelopeId} is pending signatures.
              </p>
              <form action={markSigned}>
                <SubmitButton variant="outline" pendingLabel="Updating…">
                  Mark as fully signed (manual)
                </SubmitButton>
              </form>
            </>
          ) : (
            <>
              {!docusignReady && (
                <p className="text-sm text-warning">
                  Connect DocuSign under{" "}
                  <Link href="/settings/integrations" className="font-medium underline">
                    Integrations
                  </Link>{" "}
                  to send envelopes automatically.
                </p>
              )}
              <form action={sendForSignature}>
                <SubmitButton pendingLabel="Sending…" disabled={!document.tenant?.email}>
                  Send for DocuSign signature
                </SubmitButton>
              </form>
              {!document.tenant?.email && (
                <p className="text-xs text-muted">Tenant email is required for DocuSign.</p>
              )}
              <form action={markSigned} className="pt-2">
                <SubmitButton variant="outline" pendingLabel="Updating…">
                  Already signed offline — mark complete
                </SubmitButton>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
