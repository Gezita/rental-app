"use client";

import { useRef, useState } from "react";
import { SPREADSHEET_UTILITY_OPTIONS } from "@/lib/billing-constants";
import { MONTH_NAMES } from "@/lib/billing-constants";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Input, Label, Select } from "@/components/ui";

type PreviewResult =
  | { error: string }
  | { rowCount: number; utilityType: string; existingBillCount: number };

type UtilityBillsImportFormProps = {
  previewAction: (formData: FormData) => Promise<PreviewResult>;
  importAction: (formData: FormData) => void | Promise<void>;
  defaultMonth: number;
  defaultYear: number;
  years: number[];
};

export function UtilityBillsImportForm({
  previewAction,
  importAction,
  defaultMonth,
  defaultYear,
  years,
}: UtilityBillsImportFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<{
    rowCount: number;
    utilityLabel: string;
    utilityType: string;
    existingBillCount: number;
  } | null>(null);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const utilityType = String(formData.get("utilityType") || "gas");
    const utilityLabel =
      SPREADSHEET_UTILITY_OPTIONS.find((option) => option.value === utilityType)?.label ??
      utilityType;
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      setError("Choose an .xlsx file to upload.");
      return;
    }

    const result = await previewAction(formData);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    setPreview({
      rowCount: result.rowCount,
      utilityLabel,
      utilityType: result.utilityType,
      existingBillCount: result.existingBillCount,
    });
    setPendingFormData(formData);
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (!pendingFormData || isSubmitting) return;
    setIsSubmitting(true);
    setConfirmOpen(false);

    const confirmed = new FormData();
    for (const [key, value] of pendingFormData.entries()) {
      confirmed.append(key, value);
    }
    confirmed.set("confirmed", "true");

    try {
      await importAction(confirmed);
    } catch {
      setError("Import failed. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-4"
        encType="multipart/form-data"
      >
        {error && <Alert variant="error">{error}</Alert>}

        <div className="space-y-2">
          <Label htmlFor="utilityType">Utility type</Label>
          <Select id="utilityType" name="utilityType" defaultValue="gas" required>
            {SPREADSHEET_UTILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="billMonth">Bill month (if not in file)</Label>
            <Select id="billMonth" name="billMonth" defaultValue={String(defaultMonth)}>
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={String(index + 1)}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="billYear">Bill year (if not in file)</Label>
            <Select id="billYear" name="billYear" defaultValue={String(defaultYear)}>
              {years.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="file">Excel file</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
          />
        </div>

        <SubmitButton pendingLabel="Reading file…" disabled={isSubmitting}>
          Upload and save bills
        </SubmitButton>
      </form>

      {confirmOpen && preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-confirm-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-lg)]">
            <h2 id="import-confirm-title" className="text-lg font-semibold text-foreground">
              Replace {preview.utilityLabel} bills?
            </h2>
            <p className="mt-2 text-sm text-muted">
              Found <strong>{preview.rowCount}</strong> bill
              {preview.rowCount === 1 ? "" : "s"} in the spreadsheet. Uploading will{" "}
              <strong>replace all spreadsheet-sourced {preview.utilityLabel.toLowerCase()} bills</strong>{" "}
              for this property
              {preview.existingBillCount > 0
                ? ` (${preview.existingBillCount} existing row${preview.existingBillCount === 1 ? "" : "s"} will be removed)`
                : ""}
              . Manual entries for other utility types are not affected.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setConfirmOpen(false);
                  setPendingFormData(null);
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {isSubmitting ? "Saving…" : "Replace and save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
