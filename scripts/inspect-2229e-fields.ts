import { PDFDocument } from "pdf-lib";
import { readFileSync } from "fs";

async function main() {
  const path = process.argv[2] || "/tmp/2229e.pdf";
  const bytes = readFileSync(path);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdf.getForm();
  const fields = form.getFields();
  console.log("Field count:", fields.length);
  for (const f of fields) {
    console.log(f.getName(), f.constructor.name);
  }
}

main().catch(console.error);
