import { requireTenant } from "@/lib/tenant-auth";
import { listTenantNotices } from "@/lib/tenant-portal";
import { ButtonLink, Card, CardContent, CardDescription, CardHeader, CardTitle, Table, Th, Td, Tr } from "@/components/ui";

export default async function TenantNoticesPage() {
  const tenant = await requireTenant();
  const notices = await listTenantNotices(tenant.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notices</h1>
        <p className="mt-1 text-sm text-muted">Official notices sent by your landlord</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notice history</CardTitle>
          <CardDescription>LTB and other formal notices for your tenancy</CardDescription>
        </CardHeader>
        <CardContent>
          {notices.length === 0 ? (
            <p className="text-sm text-muted">No notices on file.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Document</Th>
                  <Th>Sent</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {notices.map((notice) => (
                  <Tr key={notice.id}>
                    <Td className="font-medium">{notice.fileName}</Td>
                    <Td className="text-muted">
                      {(notice.sentToTenantAt ?? notice.createdAt).toLocaleDateString("en-CA")}
                    </Td>
                    <Td className="text-right">
                      <ButtonLink
                        href={`/api/tenant/documents/${notice.id}`}
                        variant="outline"
                        size="sm"
                        target="_blank"
                      >
                        View
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
