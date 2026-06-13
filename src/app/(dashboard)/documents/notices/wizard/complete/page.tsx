import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LTB_FORMS } from "@/lib/ltb-forms";
import { PageBackNav } from "@/components/layout/page-back-nav";
import {
  ButtonLink,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export default async function LtbNoticeWizardCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const { documentId } = await searchParams;
  if (!documentId) notFound();

  const user = await requireUser();

  const document = await prisma.document.findFirst({
    where: { id: documentId, userId: user.id, category: "ltb_notice" },
    include: { tenant: true, unit: { include: { property: true } } },
  });

  if (!document) notFound();

  const formName =
    LTB_FORMS.find((f) => f.code === document.ltbFormCode)?.name ||
    "LTB Notice";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageBackNav parent={{ href: "/documents/notices", label: "LTB Notices" }} />

      <div>
        <h1 className="text-2xl font-bold">Notice ready</h1>
        <p className="text-muted">
          Your {document.ltbFormCode} draft is saved. Download it, review against the official LTB
          form, then serve the tenant.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {document.ltbFormCode} — {formName}
          </CardTitle>
          <CardDescription>
            {document.tenant
              ? `${document.tenant.firstName} ${document.tenant.lastName}`
              : "Tenant"}{" "}
            {document.unit
              ? `· ${document.unit.property.name} / ${document.unit.name}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <ButtonLink href={`/api/documents/${document.id}`} target="_blank">
            Download PDF
          </ButtonLink>
          <ButtonLink href="/documents/notices/wizard" variant="outline">
            Fill another notice
          </ButtonLink>
          <ButtonLink href="/documents/notices" variant="outline">
            Back to notices
          </ButtonLink>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            1. Download and review this draft against the official blank{" "}
            {document.ltbFormCode} form from the{" "}
            <a
              href="https://tribunalsontario.ca/ltb/forms/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Landlord and Tenant Board
            </a>
            .
          </p>
          <p>2. Serve the notice to the tenant according to the Residential Tenancies Act.</p>
          <p>3. Keep proof of service — upload the served copy under Notices if needed.</p>
        </CardContent>
      </Card>
    </div>
  );
}
