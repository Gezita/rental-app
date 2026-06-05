import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { PageBackNav } from "@/components/layout/page-back-nav";
import type { MaintenanceStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Label, Select, Table, Th, Td, Tr } from "@/components/ui";

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary/30 bg-primary-muted text-primary-hover"
          : "border-border bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

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
    status?: MaintenanceStatus | { in: MaintenanceStatus[] };
  } = {
    property: { userId: user.id },
  };

  if (params.propertyId) {
    where.property.id = params.propertyId;
  }
  if (params.status === "open") {
    where.status = { in: ["planned", "in_progress"] };
  } else if (params.status && params.status !== "all") {
    where.status = params.status as MaintenanceStatus;
  }

  const activeStatus = params.status || "all";

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
          <p className="text-muted">Track repairs, vendors, and invoices</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/maintenance/new">
            <Button>Add Maintenance</Button>
          </Link>
          <Link href="/maintenance/receipts">
            <Button variant="outline">Receipt Repository</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterLink href="/maintenance?status=open" active={activeStatus === "open"}>
          Open
        </FilterLink>
        <FilterLink href="/maintenance" active={activeStatus === "all"}>
          All
        </FilterLink>
        <FilterLink href="/maintenance?status=planned" active={activeStatus === "planned"}>
          Planned
        </FilterLink>
        <FilterLink href="/maintenance?status=in_progress" active={activeStatus === "in_progress"}>
          In progress
        </FilterLink>
        <FilterLink href="/maintenance?status=completed" active={activeStatus === "completed"}>
          Completed
        </FilterLink>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Records</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={activeStatus}>
                <option value="all">All statuses</option>
                <option value="open">Open (planned + in progress)</option>
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
            {activeStatus === "open" ? "Open maintenance" : "Maintenance records"} ·{" "}
            {records.length} record{records.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="space-y-2 text-sm text-muted">
              <p>No maintenance records match your filters.</p>
              <Link href="/maintenance/new" className="font-medium text-primary-hover underline">
                Add a maintenance record
              </Link>
            </div>
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
