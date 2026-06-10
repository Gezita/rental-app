import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadDocumentAction } from "@/app/actions";
import { DocumentsTable } from "@/components/documents-table";
import { FlashAlert } from "@/components/flash-alert";
import { PageHeader } from "@/components/dashboard/page-header";
import { SubmitButton } from "@/components/submit-button";
import type { DocumentCategory } from "@prisma/client";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from "@/components/ui";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    uploaded?: string;
    deleted?: string;
    error?: string;
    category?: string;
    propertyId?: string;
    q?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [properties] = await Promise.all([
    prisma.property.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  const where: {
    userId: string;
    category?: DocumentCategory;
    propertyId?: string;
    OR?: { fileName: { contains: string } }[];
  } = { userId: user.id };

  if (params.category && params.category !== "all") {
    where.category = params.category as DocumentCategory;
  }
  if (params.propertyId) {
    where.propertyId = params.propertyId;
  }
  if (params.q?.trim()) {
    where.OR = [{ fileName: { contains: params.q.trim() } }];
  }

  const documents = await prisma.document.findMany({
    where,
    include: { property: true, unit: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Leases, bills, statements, receipts, and Ontario notices — your landlord filing cabinet."
      />

      {params.uploaded && (
        <FlashAlert clearParams={["uploaded"]}>Document uploaded successfully.</FlashAlert>
      )}
      {params.deleted && (
        <FlashAlert clearParams={["deleted"]}>
          {params.deleted === "1"
            ? "Document deleted."
            : `${params.deleted} documents deleted.`}
        </FlashAlert>
      )}
      {params.error === "file" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Please select a file to upload.
        </FlashAlert>
      )}
      {params.error === "none_selected" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Select at least one document to delete.
        </FlashAlert>
      )}
      {params.error === "not_found" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Document not found or already deleted.
        </FlashAlert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filter Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="q">Search</Label>
              <Input id="q" name="q" placeholder="File name..." defaultValue={params.q || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select id="category" name="category" defaultValue={params.category || "all"}>
                <option value="all">All categories</option>
                <option value="lease">Lease</option>
                <option value="utility_bill">Utility Bill</option>
                <option value="statement">Statement</option>
                <option value="receipt">Receipt</option>
                <option value="maintenance_invoice">Maintenance Invoice</option>
                <option value="maintenance_receipt">Maintenance Receipt</option>
                <option value="ltb_notice">LTB Notice</option>
                <option value="tax_report">Tax Report</option>
                <option value="photo">Photo</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyId">Property</Label>
              <Select id="propertyId" name="propertyId" defaultValue={params.propertyId || ""}>
                <option value="">All properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <SubmitButton pendingLabel="Applying…">Apply</SubmitButton>
              <Link href="/documents">
                <Button type="button" variant="outline">
                  Clear
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={uploadDocumentAction} className="grid gap-4 md:grid-cols-4" encType="multipart/form-data">
            <div className="space-y-2">
              <Label htmlFor="uploadCategory">Category</Label>
              <Select id="uploadCategory" name="category" defaultValue="other">
                <option value="lease">Lease</option>
                <option value="utility_bill">Utility Bill</option>
                <option value="statement">Statement</option>
                <option value="receipt">Receipt</option>
                <option value="maintenance_invoice">Maintenance Invoice</option>
                <option value="maintenance_receipt">Maintenance Receipt</option>
                <option value="ltb_notice">LTB Notice</option>
                <option value="tax_report">Tax Report</option>
                <option value="photo">Photo</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="uploadPropertyId">Property</Label>
              <Select id="uploadPropertyId" name="propertyId" defaultValue="">
                <option value="">None</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
            </div>
            <div className="flex items-end">
              <SubmitButton pendingLabel="Uploading…">Upload</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {documents.length} Document{documents.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted">No documents match your filters.</p>
          ) : (
            <DocumentsTable
              documents={documents.map((doc) => ({
                id: doc.id,
                fileName: doc.fileName,
                category: doc.category,
                propertyName: doc.property?.name ?? null,
                createdAt: doc.createdAt.toISOString(),
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
