"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { exportT776ForUser } from "@/lib/export-t776";

/** @deprecated Prefer GET /api/reports/t776 via ExportT776Form for direct download */
export async function exportT776ReportAction(formData: FormData) {
  const user = await requireUser();
  const year = parseInt(String(formData.get("year") || new Date().getFullYear()), 10);

  try {
    const { documentId } = await exportT776ForUser(user.id, year);
    redirect(`/reports/tax?exported=1&year=${year}&documentId=${documentId}`);
  } catch (error) {
    const message = encodeURIComponent(
      error instanceof Error ? error.message : "Could not export PDF"
    );
    redirect(`/reports/tax?error=${message}`);
  }
}
