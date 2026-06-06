"use client";

import { useState } from "react";
import { Button, Label, Select } from "@/components/ui";

type ExportT776FormProps = {
  years: number[];
  defaultYear: number;
};

export function ExportT776Form({ years, defaultYear }: ExportT776FormProps) {
  const [year, setYear] = useState(String(defaultYear));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState(false);

  async function handleExport(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSavedHint(false);

    try {
      const response = await fetch(`/api/reports/t776?year=${encodeURIComponent(year)}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Could not export PDF");
      }

      const blob = await response.blob();
      const fileName =
        response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
        `T776-summary-${year}.pdf`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setSavedHint(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleExport} className="flex flex-col items-end gap-2">
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="export-year" className="text-xs">
            Tax year
          </Label>
          <Select
            id="export-year"
            name="year"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            disabled={pending}
          >
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Exporting…" : "Export T776 PDF"}
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {savedHint && !error && (
        <p className="text-xs text-muted">
          Download started. Filled T776 form saved under Documents → Tax Report.
        </p>
      )}
    </form>
  );
}
