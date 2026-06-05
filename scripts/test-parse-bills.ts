import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { parseBillsFromXlsxBuffer } from "../src/lib/parse-bills-xlsx";

function assert(label: string, rows: ReturnType<typeof parseBillsFromXlsxBuffer>) {
  console.log(`\n✓ ${label}`);
  console.log(JSON.stringify(rows, null, 2));
}

function makeBuffer(build: (wb: XLSX.WorkBook) => void): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  build(wb);
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}

// Electricity table: Bill Date | Bill Amount
const electricityTable = makeBuffer((wb) => {
  const data = [
    ["Bill Date", "Bill Amount"],
    [new Date(2026, 0, 15), 89.45],
    [new Date(2026, 1, 14), 92.1],
    ["15/03/2026", "$78.00"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Bills");
});

assert(
  "Electricity table (Bill Date + Bill Amount)",
  parseBillsFromXlsxBuffer(electricityTable, { utilityType: "electricity" })
);

// Electricity label/value pairs (single bill)
const electricityPairs = makeBuffer((wb) => {
  const data = [
    ["Bill Date", "15/01/2026"],
    ["Bill Amount", 125.5],
    ["Account", "12345"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Bill");
});

assert(
  "Electricity label/value pairs",
  parseBillsFromXlsxBuffer(electricityPairs, { utilityType: "electricity" })
);

// Gas format: Month | Year | Amount
const gasTable = makeBuffer((wb) => {
  const data = [
    ["Month", "Year", "Amount"],
    [1, 2026, 164.75],
    [2, 2026, 211.64],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Gas");
});

assert("Gas table (Month + Year + Amount)", parseBillsFromXlsxBuffer(gasTable, { utilityType: "gas" }));

// Electricity with Due Date in December 2025 (must not become 2026)
const dueDate2025 = makeBuffer((wb) => {
  const data = [
    ["Due Date", "Bill Amount"],
    [new Date(2025, 11, 15), 142.33],
    ["15/12/2025", 138.5],
    ["December 2025", 99.0],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Bills");
});

const dueRows = parseBillsFromXlsxBuffer(dueDate2025, { utilityType: "electricity" });
assert("Due Date December 2025 stays 2025", dueRows);
if (!dueRows.every((r) => r.year === 2025 && r.month === 12)) {
  throw new Error("Expected all rows to be December 2025");
}

// Month column holds full date text without separate year column
const monthColumnFullDate = makeBuffer((wb) => {
  const data = [
    ["Month", "Amount"],
    ["December 2025", 88.0],
    ["January 2026", 91.25],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Bills");
});

const mixedRows = parseBillsFromXlsxBuffer(monthColumnFullDate, { utilityType: "electricity" });
assert("Month column with embedded year", mixedRows);
if (mixedRows[0]?.year !== 2025 || mixedRows[1]?.year !== 2026) {
  throw new Error(`Wrong years: ${JSON.stringify(mixedRows)}`);
}

// Enbridge gas: 30/31st bills roll to next month; early-month bill stays in same month
const enbridgeShift = makeBuffer((wb) => {
  const data = [
    ["Date", "Payment Amount"],
    ["03/31/202612:00 AM", 128.38],
    ["03/02/202612:00 AM", 372.14],
    ["01/30/202612:00 AM", 150.64],
    ["01/02/202612:00 AM", 145.79],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
});
const shiftRows = parseBillsFromXlsxBuffer(enbridgeShift, { utilityType: "gas" });
const mar = shiftRows.find((r) => r.month === 3 && r.year === 2026);
const apr = shiftRows.find((r) => r.month === 4 && r.year === 2026);
const jan = shiftRows.find((r) => r.month === 1 && r.year === 2026);
const feb = shiftRows.find((r) => r.month === 2 && r.year === 2026);
assert("Enbridge 30/31 → next month", shiftRows);
if (mar?.amountCents !== 37214 || apr?.amountCents !== 12838 || jan?.amountCents !== 14579 || feb?.amountCents !== 15064) {
  throw new Error(`Unexpected shift mapping: ${JSON.stringify({ mar, apr, jan, feb })}`);
}

// Real user fixtures (when present in Downloads)
const fixtureFiles = [
  { path: "/Users/gege/Downloads/2483626138.XLS", type: "gas", minRows: 9 },
  { path: "/Users/gege/Downloads/Bill_History_2026-4-14.xlsx", type: "electricity", minRows: 12 },
  { path: "/Users/gege/Downloads/billing_table.xlsx", type: "electricity", minRows: 12 },
];

for (const f of fixtureFiles) {
  if (!fs.existsSync(f.path)) continue;
  const buf = fs.readFileSync(f.path);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const rows = parseBillsFromXlsxBuffer(ab, { utilityType: f.type });
  assert(`${f.path.split("/").pop()} (${rows.length} months)`, rows);
  if (rows.length < f.minRows) {
    throw new Error(`Expected at least ${f.minRows} rows from ${f.path}`);
  }
}

// Write sample file for manual testing
const samplesDir = path.join(process.cwd(), "public", "samples");
fs.mkdirSync(samplesDir, { recursive: true });
const samplePath = path.join(samplesDir, "electricity-bills.example.xlsx");
fs.writeFileSync(samplePath, Buffer.from(electricityTable));
console.log(`\nWrote sample: ${samplePath}`);
