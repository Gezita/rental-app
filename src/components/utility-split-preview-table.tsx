import { formatMoney } from "@/lib/money";
import type { UtilitySplitPreviewRow } from "@/lib/utility-split-preview";
import { Table, Th, Td, Tr } from "@/components/ui";

type UtilitySplitPreviewTableProps = {
  rows: UtilitySplitPreviewRow[];
  totalAmountCents: number;
};

export function UtilitySplitPreviewTable({ rows, totalAmountCents }: UtilitySplitPreviewTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        No unit split rules apply to this utility type. Configure utility split rules on each unit
        first.
      </p>
    );
  }

  const allocated = rows.reduce((sum, row) => sum + row.amountCents, 0);

  return (
    <div className="space-y-2">
      <Table>
        <thead>
          <tr>
            <Th>Unit</Th>
            <Th className="text-right">Share</Th>
            <Th className="text-right">Amount</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Tr key={row.unitId}>
              <Td>{row.unitName}</Td>
              <Td className="text-right tabular-nums">{row.percentage}%</Td>
              <Td className="text-right tabular-nums">{formatMoney(row.amountCents)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <p className="text-sm text-muted">
        Total bill {formatMoney(totalAmountCents)} · Allocated {formatMoney(allocated)}
      </p>
    </div>
  );
}
