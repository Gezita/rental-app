import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { PageBackNav } from "@/components/layout/page-back-nav";
import type { MaintenanceStatus } from "@prisma/client";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Label, Select, Table, Th, Td, Tr } from "@/components/ui";

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; propertyId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  const where: {
    property: { userId: string; id?: string };
    status?: MaintenanceStatus;
  } = {
    property: { userId: user.id },
  };

  if (params.propertyId) {
    where.property.id = params.propertyId;
  }
  if (params.status && params.status !== "all") {
    where.status = params.status as MaintenanceStatus;
  }

  const records = await prisma.maintenanceRecord.findMany({
    where,
    include: { property: true, unit: true, invoiceDocument: true },
    orderBy: { createdAt: "desc" },
  });

  const statusVariant = (status: string) => {
    if (status === "completed") return "success";
    if (status === "in_progress") return "secondary";
    if (status === "cancelled") return "default";
    return "warning";
  };

  return (
    <div className="space-y-6">
      <PageBackNav />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Maintenance</h1>
          <p className="text-slate-500">Track repairs, vendors, and invoices</p>
        </div>
        <Link href="/maintenance/new">
          <Button>Add Maintenance</Button>
        </Link>
        <Link href="/maintenance/receipts">
          <Button variant="outline">Receipt Repository</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Records</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={params.status || "all"}>
                <option value="all">All statuses</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
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
              <Button type="submit">Apply</Button>
              <Link href="/maintenance">
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
          <CardTitle>
            {records.length} Record{records.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-slate-500">No maintenance records match your filters.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Title</Th>
                  <Th>Property</Th>
                  <Th>Unit</Th>
                  <Th>Vendor</Th>
                  <Th>Cost</Th>
                  <Th>Status</Th>
                  <Th>Invoice</Th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <Tr key={record.id}>
                    <Td className="font-medium">{record.title}</Td>
                    <Td>{record.property.name}</Td>
                    <Td>{record.unit?.name || "—"}</Td>
                    <Td>{record.vendorName || "—"}</Td>
                    <Td>{record.costCents ? formatMoney(record.costCents) : "—"}</Td>
                    <Td>
                      <Badge variant={statusVariant(record.status)}>
                        {record.status.replace("_", " ")}
                      </Badge>
                    </Td>
                    <Td>
                      {record.invoiceDocument ? (
                        <Link href={`/api/documents/${record.invoiceDocument.id}`} target="_blank">
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      ) : (
                        "—"
                      )}
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
