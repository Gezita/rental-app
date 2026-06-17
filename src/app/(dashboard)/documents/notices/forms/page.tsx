import { PageBackNav } from "@/components/layout/page-back-nav";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  LTB_FORM_GROUPS,
  LTB_FORMS,
  LTB_FORMS_INDEX_URL,
  getLtbFormsByCategory,
  type LtbForm,
} from "@/lib/ltb-forms";
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

const audienceLabel: Record<LtbForm["audience"], string> = {
  landlord: "Landlord",
  tenant: "Tenant",
  both: "Both parties",
};

const categoryLabel: Record<LtbForm["category"], string> = {
  rent_increase: "Rent increase",
  termination: "Termination",
  agreement: "Agreement",
  other: "Other",
};

const categoryBadgeVariant: Record<LtbForm["category"], "default" | "success" | "warning" | "danger" | "secondary"> = {
  rent_increase: "secondary",
  termination: "warning",
  agreement: "success",
  other: "default",
};

function FormCard({ form }: { form: LtbForm }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{form.code}</Badge>
              <Badge variant={categoryBadgeVariant[form.category]}>
                {categoryLabel[form.category]}
              </Badge>
              <Badge>{audienceLabel[form.audience]}</Badge>
            </div>
            <CardTitle>{form.name}</CardTitle>
          </div>
        </div>
        <CardDescription>{form.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-medium text-foreground">Use for:</span>{" "}
            <span className="text-muted-foreground">{form.primaryUse}</span>
          </p>
          {form.minimumNotice && (
            <p>
              <span className="font-medium text-foreground">Notice timing:</span>{" "}
              <span className="text-muted-foreground">{form.minimumNotice}</span>
            </p>
          )}
          {form.relatedApplication && (
            <p>
              <span className="font-medium text-foreground">Related application:</span>{" "}
              <span className="text-muted-foreground">{form.relatedApplication}</span>
            </p>
          )}
          {form.caution && (
            <Alert variant="warning" className="mt-3">
              {form.caution}
            </Alert>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/documents/notices/wizard?formCode=${form.code}`} size="sm">
            Open wizard
          </ButtonLink>
          <ButtonLink
            href={form.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            size="sm"
          >
            Official PDF
          </ButtonLink>
          {form.instructionsUrl && (
            <ButtonLink
              href={form.instructionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="ghost"
              size="sm"
            >
              Instructions
            </ButtonLink>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function LtbNFormsPage() {
  const landlordForms = LTB_FORMS.filter((form) => form.audience === "landlord").length;
  const tenantForms = LTB_FORMS.filter((form) => form.audience === "tenant").length;
  const agreementForms = LTB_FORMS.filter((form) => form.audience === "both").length;

  return (
    <div className="space-y-6">
      <PageBackNav parent={{ href: "/documents/notices", label: "Notices" }} />

      <PageHeader
        title="LTB N Forms"
        description="Browse every official Ontario Landlord and Tenant Board N-series form, open a guided draft, or download the official PDF."
        actions={
          <ButtonLink
            href={LTB_FORMS_INDEX_URL}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
          >
            Official LTB forms page
          </ButtonLink>
        }
      />

      <Alert variant="info">
        Lessora can prepare draft notice details and save a PDF to your documents. Always review the
        latest official LTB PDF and instructions before serving, signing, or relying on a form.
      </Alert>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total N-series forms</CardDescription>
            <CardTitle>{LTB_FORMS.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Landlord forms</CardDescription>
            <CardTitle>{landlordForms}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tenant forms</CardDescription>
            <CardTitle>{tenantForms}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Agreement forms</CardDescription>
            <CardTitle>{agreementForms}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {LTB_FORM_GROUPS.map((group) => {
        const forms = getLtbFormsByCategory(group.category);
        if (forms.length === 0) return null;

        return (
          <section key={group.category} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{group.title}</h2>
              <p className="text-sm text-muted">{group.description}</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {forms.map((form) => (
                <FormCard key={form.code} form={form} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
