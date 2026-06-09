"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { INSPECTION_ITEM_STATUS_LABELS } from "@/lib/inspection-checklist";
import { saveInspectionAction, uploadInspectionItemPhotoAction } from "@/app/actions/inspections";
import { Button, Label, Select, Textarea } from "@/components/ui";

type InspectionItemData = {
  id: string;
  label: string;
  status: "pending" | "pass" | "fail" | "na";
  notes: string | null;
  photos: { id: string; documentId: string; fileName: string }[];
};

type InspectionFormProps = {
  inspectionId: string;
  overallNotes: string | null;
  status: "in_progress" | "completed";
  items: InspectionItemData[];
};

export function InspectionForm({
  inspectionId,
  overallNotes,
  status,
  items,
}: InspectionFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [, startUpload] = useTransition();
  const saveInspection = saveInspectionAction.bind(null, inspectionId);
  const readOnly = status === "completed";
  const formId = `inspection-${inspectionId}`;

  function handlePhotoUpload(itemId: string, file: File) {
    const formData = new FormData();
    formData.set("inspectionItemId", itemId);
    formData.set("file", file);
    setUploadingItemId(itemId);
    startUpload(async () => {
      await uploadInspectionItemPhotoAction(formData);
      setUploadingItemId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">{item.label}</h3>
                <p className="text-sm text-muted">Verify condition and note any issues.</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`status-${item.id}`}>Result</Label>
                <Select
                  id={`status-${item.id}`}
                  name={`status-${item.id}`}
                  form={formId}
                  defaultValue={item.status}
                  disabled={readOnly}
                  className="min-w-36"
                >
                  {Object.entries(INSPECTION_ITEM_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor={`notes-${item.id}`}>Notes</Label>
              <Textarea
                id={`notes-${item.id}`}
                name={`notes-${item.id}`}
                form={formId}
                rows={3}
                placeholder="Describe what you observed, damage, or follow-up needed…"
                defaultValue={item.notes ?? ""}
                disabled={readOnly}
              />
            </div>

            {item.photos.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {item.photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={`/api/documents/${photo.documentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-xl border border-border"
                  >
                    <Image
                      src={`/api/documents/${photo.documentId}`}
                      alt={photo.fileName}
                      width={120}
                      height={120}
                      className="h-24 w-24 object-cover"
                      unoptimized
                    />
                  </a>
                ))}
              </div>
            )}

            {!readOnly && (
              <div className="mt-4 rounded-xl border border-dashed border-border-subtle bg-surface-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">Add photo</p>
                <p className="mb-3 text-xs text-muted">JPG, PNG, or PDF — up to 10 MB each.</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  disabled={uploadingItemId === item.id}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handlePhotoUpload(item.id, file);
                    event.target.value = "";
                  }}
                  className="block max-w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-hover"
                />
                {uploadingItemId === item.id && (
                  <p className="mt-2 text-xs text-muted">Uploading…</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <form
        id={formId}
        action={async (formData) => {
          setPending(true);
          await saveInspection(formData);
        }}
        className="space-y-6"
      >
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
          <div className="space-y-2">
            <Label htmlFor="overallNotes">Overall summary</Label>
            <Textarea
              id="overallNotes"
              name="overallNotes"
              rows={4}
              placeholder="General comments about the unit condition, tenant presence, or next steps…"
              defaultValue={overallNotes ?? ""}
              disabled={readOnly}
            />
          </div>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="outline" disabled={pending}>
              Save progress
            </Button>
            <Button type="submit" name="complete" value="1" disabled={pending}>
              Complete inspection
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
