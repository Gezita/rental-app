import { requireTenant } from "@/lib/tenant-auth";
import { listTenantDocuments } from "@/lib/tenant-portal";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/document-constants";
import { ButtonLink, Card, CardContent, CardDescription, CardHeader, CardTitle, Table, Th, Td, Tr } from "@/components/ui";

export default async function TenantDocumentsPage() {
  const tenant = await requireTenant();
  const documents = await listTenantDocuments(tenant.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Documents</h1>
        <p className="mt-1 text-sm text-muted">Files shared with you by your landlord</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shared files</CardTitle>
          <CardDescription>Leases, receipts, and other documents for your tenancy</CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted">No documents shared yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Category</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <Tr key={document.id}>
                    <Td className="font-medium">{document.fileName}</Td>
                    <Td className="text-muted">
                      {DOCUMENT_CATEGORY_LABELS[document.category]}
                    </Td>
                    <Td className="text-muted">
                      {document.createdAt.toLocaleDateString("en-CA")}
                    </Td>
                    <Td className="text-right">
                      <ButtonLink
                        href={`/api/tenant/documents/${document.id}`}
                        variant="outline"
                        size="sm"
                        target="_blank"
                      >
                        Open
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
