import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadDocumentAction } from "@/app/actions/app";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { FlashAlert } from "@/components/flash-alert";
import { SubmitButton } from "@/components/submit-button";
import type { DocumentCategory } from "@prisma/client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    uploaded?: string;
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
      <PageBackNav />
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-muted">All leases, bills, statements, and receipts</p>
      </div>

      {params.uploaded && (
        <FlashAlert clearParams={["uploaded"]}>Document uploaded successfully.</FlashAlert>
      )}
      {params.error && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Please select a file to upload.
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
            <Table>
              <thead>
                <tr>
                  <Th>File</Th>
                  <Th>Category</Th>
                  <Th>Property</Th>
                  <Th>Date</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <Tr key={doc.id}>
                    <Td>{doc.fileName}</Td>
                    <Td>
                      <Badge variant="secondary">{doc.category.replace("_", " ")}</Badge>
                    </Td>
                    <Td>{doc.property?.name || "—"}</Td>
                    <Td>{doc.createdAt.toLocaleDateString()}</Td>
                    <Td>
                      <Link href={`/api/documents/${doc.id}`} target="_blank">
                        <Button variant="outline" size="sm">
                          Download
                        </Button>
                      </Link>
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
