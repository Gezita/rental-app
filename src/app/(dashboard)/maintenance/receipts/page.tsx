import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadMaintenanceReceiptAction } from "@/app/actions/communications";
import { PageBackNav } from "@/components/layout/page-back-nav";
import {
  Alert,
  Badge,
  Button,
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

export default async function MaintenanceReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string; error?: string; propertyId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    include: {
      maintenanceRecords: {
        include: { unit: true, invoiceDocument: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const receipts = await prisma.document.findMany({
    where: {
      userId: user.id,
      category: { in: ["maintenance_receipt", "maintenance_invoice"] },
      ...(params.propertyId ? { propertyId: params.propertyId } : {}),
    },
    include: { property: true, unit: true },
    orderBy: { createdAt: "desc" },
  });

  const maintenanceRecords = properties.flatMap((property) =>
    property.maintenanceRecords.map((record) => ({
      ...record,
      propertyName: property.name,
    }))
  );

  return (
    <div className="space-y-6">
      <PageBackNav parent={{ href: "/maintenance", label: "Maintenance" }} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Receipts</h1>
          <p className="text-muted">
            Repository of maintenance invoices and receipts across all properties
          </p>
        </div>
        <Link href="/maintenance">
          <Button variant="outline">Back to maintenance log</Button>
        </Link>
      </div>

      {params.uploaded && <Alert>Maintenance receipt uploaded.</Alert>}
      {params.error && <Alert variant="error">Property and receipt file are required.</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Upload Receipt</CardTitle>
          <CardDescription>
            Store vendor receipts and invoices. Optionally link to an existing maintenance record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={uploadMaintenanceReceiptAction}
            className="grid gap-4 md:grid-cols-2"
            encType="multipart/form-data"
          >
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
              <Label htmlFor="maintenanceRecordId">Link to maintenance record</Label>
              <Select id="maintenanceRecordId" name="maintenanceRecordId" defaultValue="">
                <option value="">None</option>
                {maintenanceRecords.map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.propertyName} — {record.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorName">Vendor</Label>
              <Input id="vendorName" name="vendorName" placeholder="Vendor name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiptDate">Receipt date</Label>
              <Input id="receiptDate" name="receiptDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Receipt file</Label>
              <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Optional notes" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Upload receipt</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filter Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="filterPropertyId">Property</Label>
              <Select
                id="filterPropertyId"
                name="propertyId"
                defaultValue={params.propertyId || ""}
              >
                <option value="">All properties</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Apply</Button>
            <Link href="/maintenance/receipts">
              <Button type="button" variant="outline">
                Clear
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {receipts.length} Receipt{receipts.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <p className="text-sm text-muted">No maintenance receipts uploaded yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>File</Th>
                  <Th>Type</Th>
                  <Th>Property</Th>
                  <Th>Unit</Th>
                  <Th>Notes</Th>
                  <Th>Date</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <Tr key={receipt.id}>
                    <Td className="font-medium">{receipt.fileName}</Td>
                    <Td>
                      <Badge variant="secondary">
                        {receipt.category === "maintenance_invoice" ? "Invoice" : "Receipt"}
                      </Badge>
                    </Td>
                    <Td>{receipt.property?.name || "—"}</Td>
                    <Td>{receipt.unit?.name || "—"}</Td>
                    <Td className="max-w-xs truncate text-sm text-muted">
                      {receipt.notes || "—"}
                    </Td>
                    <Td>{receipt.createdAt.toLocaleDateString()}</Td>
                    <Td>
                      <Link href={`/api/documents/${receipt.id}`} target="_blank">
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
