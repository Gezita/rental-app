import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { PageHeader } from "@/components/dashboard/page-header";
import { FlashAlert } from "@/components/flash-alert";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const inspections = await prisma.inspection.findMany({
    where: { property: { userId: user.id } },
    include: {
      property: true,
      unit: true,
      _count: { select: { items: true } },
    },
    orderBy: { inspectionDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageBackNav />
      <PageHeader
        title="Inspections"
        description="Move-in, move-out, and periodic unit inspections with photos and notes."
        actions={
          <Link href="/inspections/new">
            <Button>Start new inspection</Button>
          </Link>
        }
      />

      {params.deleted && <FlashAlert clearParams={["deleted"]}>Inspection deleted.</FlashAlert>}
      {params.error === "not_found" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Inspection not found.
        </FlashAlert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <CardTitle>Past inspections</CardTitle>
          </div>
          <CardDescription>
            {inspections.length === 0
              ? "No inspections yet — start one to document unit condition."
              : `${inspections.length} inspection${inspections.length === 1 ? "" : "s"} on file`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inspections.length === 0 ? (
            <p className="text-sm text-muted">
              Use the checklist to verify each area of a unit and attach photos as evidence.{" "}
              <Link href="/inspections/new" className="font-medium text-primary-hover underline">
                Start your first inspection
              </Link>
            </p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Property</Th>
                  <Th>Unit</Th>
                  <Th>Title</Th>
                  <Th>Status</Th>
                  <Th>Items</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((inspection) => (
                  <Tr key={inspection.id}>
                    <Td>{inspection.inspectionDate.toLocaleDateString("en-CA")}</Td>
                    <Td>{inspection.property.name}</Td>
                    <Td>{inspection.unit?.name ?? "Whole property"}</Td>
                    <Td>{inspection.title}</Td>
                    <Td>
                      <Badge variant={inspection.status === "completed" ? "success" : "warning"}>
                        {inspection.status === "completed" ? "Completed" : "In progress"}
                      </Badge>
                    </Td>
                    <Td>{inspection._count.items}</Td>
                    <Td>
                      <Link href={`/inspections/${inspection.id}`}>
                        <Button variant="outline" size="sm">
                          {inspection.status === "completed" ? "View" : "Continue"}
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
