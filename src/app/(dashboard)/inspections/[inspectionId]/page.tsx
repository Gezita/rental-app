import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteInspectionAction } from "@/app/actions/inspections";
import { InspectionForm } from "@/components/inspection-form";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { PageHeader } from "@/components/dashboard/page-header";
import { FlashAlert } from "@/components/flash-alert";
import { Badge } from "@/components/ui";

export default async function InspectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ inspectionId: string }>;
  searchParams: Promise<{ saved?: string; updated?: string; photo?: string; error?: string }>;
}) {
  const { inspectionId } = await params;
  const query = await searchParams;
  const user = await requireUser();

  const inspection = await prisma.inspection.findFirst({
    where: { id: inspectionId, property: { userId: user.id } },
    include: {
      property: true,
      unit: true,
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          photos: { include: { document: true } },
        },
      },
    },
  });

  if (!inspection) notFound();

  const deleteInspection = deleteInspectionAction.bind(null, inspectionId);
  const location = inspection.unit
    ? `${inspection.property.name} — ${inspection.unit.name}`
    : inspection.property.name;

  return (
    <div className="space-y-6">
      <PageBackNav parent={{ href: "/inspections", label: "Inspections" }} />

      {query.saved && (
        <FlashAlert clearParams={["saved"]}>Inspection marked complete.</FlashAlert>
      )}
      {query.updated && (
        <FlashAlert clearParams={["updated"]}>Progress saved.</FlashAlert>
      )}
      {query.photo && <FlashAlert clearParams={["photo"]}>Photo uploaded.</FlashAlert>}
      {query.error === "delete_confirm" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Delete cancelled — type the inspection title exactly to confirm.
        </FlashAlert>
      )}

      <PageHeader
        title={inspection.title}
        description={`${location} · ${inspection.inspectionDate.toLocaleDateString("en-CA")}`}
        actions={
          <Badge variant={inspection.status === "completed" ? "success" : "warning"}>
            {inspection.status === "completed" ? "Completed" : "In progress"}
          </Badge>
        }
      />

      <InspectionForm
        inspectionId={inspection.id}
        overallNotes={inspection.overallNotes}
        status={inspection.status}
        items={inspection.items.map((item) => ({
          id: item.id,
          label: item.label,
          status: item.status,
          notes: item.notes,
          photos: item.photos.map((photo) => ({
            id: photo.id,
            documentId: photo.documentId,
            fileName: photo.document.fileName,
          })),
        }))}
      />

      <ConfirmDeleteForm
        action={deleteInspection}
        entityName={inspection.title}
        buttonLabel="Delete inspection"
        description="This permanently removes the inspection, all checklist notes, and uploaded photos."
      />
    </div>
  );
}
