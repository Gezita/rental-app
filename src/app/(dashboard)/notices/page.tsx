import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  sendAnnouncementEmailAction,
  sendLtbNoticeEmailAction,
  uploadLtbNoticeAction,
} from "@/app/actions/communications";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { EmailHtmlPreview } from "@/components/email-html-preview";
import { LTB_FORMS, LTB_FORMS_INDEX_URL } from "@/lib/ltb-forms";
import { buildAnnouncementEmailContent, buildLtbNoticeEmailContent } from "@/lib/tenant-communications";
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Table,
  Textarea,
  Th,
  Td,
  Tr,
} from "@/components/ui";

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{
    uploaded?: string;
    sent?: string;
    announcementSent?: string;
    documentId?: string;
    error?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [properties, tenants, uploadedNotices] = await Promise.all([
    prisma.property.findMany({
      where: { userId: user.id },
      include: { units: { include: { tenants: { where: { isActive: true } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.tenant.findMany({
      where: { isActive: true, unit: { property: { userId: user.id } } },
      include: { unit: { include: { property: true } } },
      orderBy: { lastName: "asc" },
    }),
    prisma.document.findMany({
      where: { userId: user.id, category: "ltb_notice" },
      include: { property: true, unit: true, tenant: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const landlordName = user.settings?.landlordName || user.name || user.email;
  const previewDocument = params.documentId
    ? uploadedNotices.find((doc) => doc.id === params.documentId)
    : uploadedNotices[0];

  const ltbPreview =
    previewDocument && previewDocument.tenant
      ? buildLtbNoticeEmailContent({
          tenantName: previewDocument.tenant.firstName,
          formCode: previewDocument.ltbFormCode || "N4",
          formName:
            LTB_FORMS.find((form) => form.code === previewDocument.ltbFormCode)?.name ||
            "Landlord and Tenant Board Notice",
          propertyName: previewDocument.property?.name || "Property",
          unitName: previewDocument.unit?.name || "Unit",
          propertyAddress: [
            previewDocument.property?.addressLine1,
            previewDocument.property?.city,
          ]
            .filter(Boolean)
            .join(", "),
          landlordName,
          landlordEmail: user.email,
        })
      : null;

  const announcementPreview = buildAnnouncementEmailContent({
    tenantName: "Alex",
    subjectLine: "Building maintenance scheduled",
    propertyName: properties[0]?.name,
    unitName: properties[0]?.units[0]?.name,
    message:
      "Please note that scheduled maintenance will take place next week. Access to the unit may be required between 9:00 a.m. and 5:00 p.m. Contact us if you need to reschedule.",
    landlordName,
    landlordEmail: user.email,
  });

  return (
    <div className="space-y-6">
      <PageBackNav />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">LTB Notices & Tenant Communications</h1>
          <p className="text-muted">
            Ontario Landlord and Tenant Board N-series forms, notice delivery, and announcements
          </p>
        </div>
        <ButtonLink href="/notices/wizard">Open notice wizard</ButtonLink>
      </div>

      {params.uploaded && <Alert>Notice uploaded successfully.</Alert>}
      {params.sent && <Alert>Notice email sent to tenant.</Alert>}
      {params.announcementSent && (
        <Alert>Announcement sent to {params.announcementSent} tenant(s).</Alert>
      )}
      {params.error === "required" && (
        <Alert variant="error">Please complete all required fields and attach a PDF.</Alert>
      )}
      {params.error === "invalid_form" && (
        <Alert variant="error">Please select a valid LTB form code.</Alert>
      )}
      {params.error === "announcement_required" && (
        <Alert variant="error">Subject and message are required for announcements.</Alert>
      )}
      {params.error === "no_email" && (
        <Alert variant="error">No tenants with email addresses matched your selection.</Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fill Official LTB Forms</CardTitle>
          <CardDescription>
            Step through N-series notices with tenant and property details pre-filled, then generate
            a draft PDF ready to review against the official form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ButtonLink href="/notices/wizard">Start LTB notice wizard</ButtonLink>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Download Official LTB N-Series Forms</CardTitle>
          <CardDescription>
            Blank forms from the{" "}
            <Link href={LTB_FORMS_INDEX_URL} target="_blank" className="underline">
              Landlord and Tenant Board
            </Link>
            . Complete the form, then upload it below to send to your tenant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>Form</Th>
                <Th>Description</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {LTB_FORMS.map((form) => (
                <Tr key={form.code}>
                  <Td className="font-medium">{form.code}</Td>
                  <Td>
                    <p className="font-medium">{form.name}</p>
                    <p className="text-sm text-muted">{form.description}</p>
                  </Td>
                  <Td>
                    <ButtonLink
                      href={form.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outline"
                      size="sm"
                    >
                      Download PDF
                    </ButtonLink>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Completed Notice</CardTitle>
            <CardDescription>
              Store the completed PDF and prepare it for delivery to the tenant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={uploadLtbNoticeAction} className="space-y-4" encType="multipart/form-data">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="formCode">LTB form</Label>
                  <Select id="formCode" name="formCode" required defaultValue="N4">
                    {LTB_FORMS.map((form) => (
                      <option key={form.code} value={form.code}>
                        {form.code} — {form.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertyId">Property</Label>
                  <Select id="propertyId" name="propertyId" required defaultValue={properties[0]?.id || ""}>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitId">Unit</Label>
                  <Select id="unitId" name="unitId" defaultValue="">
                    <option value="">Select unit</option>
                    {properties.flatMap((property) =>
                      property.units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {property.name} — {unit.name}
                        </option>
                      ))
                    )}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantId">Tenant</Label>
                  <Select id="tenantId" name="tenantId" defaultValue="">
                    <option value="">Select tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.firstName} {tenant.lastName} ({tenant.unit.property.name})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effectiveDate">Effective / termination date</Label>
                  <Input id="effectiveDate" name="effectiveDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">Completed PDF</Label>
                  <Input id="file" name="file" type="file" accept=".pdf" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Internal notes</Label>
                <Textarea id="notes" name="notes" placeholder="Optional notes for your records" />
              </div>
              <Button type="submit">Upload notice</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Send Notice Email</CardTitle>
            <CardDescription>
              Email the uploaded notice to the tenant with a professional layout and PDF attachment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadedNotices.length === 0 ? (
              <p className="text-sm text-muted">Upload a notice first.</p>
            ) : (
              <>
                <form action={sendLtbNoticeEmailAction} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentId">Uploaded notice</Label>
                    <Select
                      id="documentId"
                      name="documentId"
                      defaultValue={previewDocument?.id || uploadedNotices[0]?.id}
                      required
                    >
                      {uploadedNotices.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.ltbFormCode || "LTB"} — {doc.fileName}
                          {doc.tenant
                            ? ` (${doc.tenant.firstName} ${doc.tenant.lastName})`
                            : ""}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sendEffectiveDate">Effective / termination date</Label>
                    <Input id="sendEffectiveDate" name="effectiveDate" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customMessage">Additional message</Label>
                    <Textarea
                      id="customMessage"
                      name="customMessage"
                      placeholder="Optional message included in the email body"
                    />
                  </div>
                  <Button type="submit">Send notice email</Button>
                </form>
                {ltbPreview && (
                  <EmailHtmlPreview html={ltbPreview.html} subject={ltbPreview.subject} />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send Announcement</CardTitle>
          <CardDescription>
            Email all active tenants, a property, or selected tenants with a custom announcement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form action={sendAnnouncementEmailAction} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  placeholder="Building maintenance scheduled"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  rows={5}
                  placeholder="Write your announcement to tenants..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="announcementPropertyId">Limit to property (optional)</Label>
                <Select id="announcementPropertyId" name="propertyId" defaultValue="">
                  <option value="">All properties</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantIds">Or select specific tenants</Label>
                <Select id="tenantIds" name="tenantIds" multiple className="min-h-32">
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.firstName} {tenant.lastName} — {tenant.unit.property.name} /{" "}
                      {tenant.unit.name}
                      {tenant.email ? "" : " (no email)"}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <Button type="submit">Send announcement</Button>
          </form>
          <EmailHtmlPreview
            html={announcementPreview.html}
            subject={announcementPreview.subject}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Notices</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadedNotices.length === 0 ? (
            <p className="text-sm text-muted">No uploaded LTB notices yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Form</Th>
                  <Th>Tenant</Th>
                  <Th>Property</Th>
                  <Th>Uploaded</Th>
                  <Th>Sent</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {uploadedNotices.map((doc) => (
                  <Tr key={doc.id}>
                    <Td>{doc.ltbFormCode || "—"}</Td>
                    <Td>
                      {doc.tenant
                        ? `${doc.tenant.firstName} ${doc.tenant.lastName}`
                        : "—"}
                    </Td>
                    <Td>{doc.property?.name || "—"}</Td>
                    <Td>{doc.createdAt.toLocaleDateString()}</Td>
                    <Td>
                      {doc.sentToTenantAt ? (
                        <Badge variant="success">{doc.sentToTenantAt.toLocaleDateString()}</Badge>
                      ) : (
                        <Badge variant="warning">Not sent</Badge>
                      )}
                    </Td>
                    <Td>
                      <ButtonLink
                        href={`/api/documents/${doc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outline"
                        size="sm"
                      >
                        Download
                      </ButtonLink>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
