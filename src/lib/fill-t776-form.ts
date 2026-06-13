import { spawn } from "child_process";
import path from "path";
import { mkdir, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import type { T776Report } from "@/lib/t776-report";

const T776_TEMPLATE = path.join(process.cwd(), "assets/forms/t776-fill-25e.pdf");

export type T776FillContext = {
  landlordName: string;
  addressLine1?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};

function formatDollars(cents: number): string {
  if (!cents) return "";
  return (cents / 100).toFixed(2);
}

function buildFieldValues(report: T776Report, ctx: T776FillContext): Record<string, string> {
  const year = report.year;
  const fields: Record<string, string> = {
    "P1_Frm_Ln1_Grp1_inpt[0]": ctx.landlordName,
    "P1_Frm_Ln2_inpt1[0]": ctx.addressLine1 || "",
    "P1_Frm_Ln2_inpt2[0]": ctx.city || "",
    "P1_Frm_Ln2_Grp1_inpt[0]": ctx.province || "",
    "P1_Frm_Ln2_Grp2_input[0]": ctx.postalCode || "",
    "P1_Frm_Ln3_Grp2_inpt1[0]": `${year}0101`,
    "P1_Frm_Ln3_Grp1_grp1_inpt[0]": String(year),
    "P1_Frm_Ln3_Grp1_grp2_inpt[0]": "1231",
    "P3_Frm_Ln8141_inpt[0]": formatDollars(report.totals.grossRentalIncomeCents),
    "P3_Frm_Ln8299_inpt[0]": formatDollars(report.totals.grossRentalIncomeCents),
    "P4_Frm_Ln8690_inpt1[0]": formatDollars(report.totals.insuranceCents),
    "P4_Frm_Ln8710_inpt1[0]": formatDollars(report.totals.mortgageInterestCents),
    "P4_Frm_Ln8960_inpt1[0]": formatDollars(report.totals.maintenanceCents),
    "P4_Frm_Ln9180_inpt1[0]": formatDollars(report.totals.propertyTaxCents),
    "P4_Frm_Ln9220_inpt1[0]": formatDollars(report.totals.netUtilityExpenseCents),
    "P4_Frm_LnA_inpt[0]": formatDollars(report.totals.totalExpensesCents),
    "P4_Frm_Ln9369_inpt[0]": formatDollars(report.totals.netIncomeCents),
    "P4_Frm_Ln9946_inpt[0]": formatDollars(report.totals.netIncomeCents),
  };

  const rowSlots = [
    ["P3_Frm_Row1_Cell1[0]", "P3_Frm_Row1_Cell2[0]", "P3_Frm_Row1_Cell4[0]"],
    ["P3_Frm_Row2_Cell1[0]", "P3_Frm_Row2_Cell2[0]", "P3_Frm_Row2_Cell4[0]"],
    ["P3_Frm_Row3_Cell1[0]", "P3_Frm_Row3_Cell2[0]", "P3_Frm_Row3_Cell4[0]"],
  ] as const;

  report.properties.slice(0, rowSlots.length).forEach((property, index) => {
    const [addrField, unitsField, rentField] = rowSlots[index];
    fields[addrField] = property.address || property.propertyName;
    fields[unitsField] = String(property.unitCount);
    fields[rentField] = formatDollars(property.grossRentalIncomeCents);
  });

  return fields;
}

function runFillScript(
  templatePath: string,
  outputPath: string,
  fields: Record<string, string>
): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts/fill-t776.py");
    const child = spawn("python3", [scriptPath, templatePath, outputPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `fill-t776.py exited with code ${code}`));
    });

    child.stdin.write(JSON.stringify({ fields }));
    child.stdin.end();
  });
}

export async function fillT776FormPdf(report: T776Report, userId: string): Promise<Buffer> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true, properties: { take: 1, orderBy: { createdAt: "asc" } } },
  });
  if (!user) throw new Error("User not found");

  const primaryProperty = user.properties[0];
  const ctx: T776FillContext = {
    landlordName: report.landlordName,
    addressLine1: primaryProperty?.addressLine1,
    city: primaryProperty?.city,
    province: primaryProperty?.province ?? undefined,
    postalCode: primaryProperty?.postalCode ?? undefined,
  };

  const fields = buildFieldValues(report, ctx);
  const tempDir = path.join(tmpdir(), "Lessora-t776");
  await mkdir(tempDir, { recursive: true });
  const token = randomBytes(8).toString("hex");
  const outputPath = path.join(tempDir, `t776-${token}.pdf`);

  try {
    await runFillScript(T776_TEMPLATE, outputPath, fields);
    return await readFile(outputPath);
  } finally {
    await unlink(outputPath).catch(() => undefined);
  }
}
