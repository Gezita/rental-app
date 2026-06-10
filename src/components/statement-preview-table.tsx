import { formatMoney } from "@/lib/money";
import type { StatementPreviewRow } from "@/lib/statement-preview";
import { StatusBadge } from "@/components/status-badge";
import { Table, Th, Td, Tr } from "@/components/ui";

type StatementPreviewTableProps = {
  rows: StatementPreviewRow[];
};

export function StatementPreviewTable({ rows }: StatementPreviewTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">Select at least one unit with an active tenant.</p>;
  }

  return (
    <div className="space-y-3">
      <Table>
        <thead>
          <tr>
            <Th>Unit</Th>
            <Th>Tenant</Th>
            <Th className="text-right">Rent</Th>
            <Th className="text-right">Utilities</Th>
            <Th className="text-right">Prior balance</Th>
            <Th className="text-right">Total</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Tr key={row.unitId}>
              <Td>
                <p className="font-medium">{row.unitName}</p>
                <p className="text-xs text-muted">{row.propertyName}</p>
              </Td>
              <Td>{row.tenantName ?? "—"}</Td>
              <Td className="text-right tabular-nums">{formatMoney(row.rentAmountCents)}</Td>
              <Td className="text-right tabular-nums">{formatMoney(row.utilityTotalCents)}</Td>
              <Td className="text-right tabular-nums">
                {row.previousBalanceCents > 0 ? formatMoney(row.previousBalanceCents) : "—"}
              </Td>
              <Td className="text-right font-medium tabular-nums">
                {formatMoney(row.totalDueCents)}
              </Td>
              <Td>
                <StatusBadge
                  status={row.status === "ready" ? "ready" : row.status === "no_tenant" ? "missing" : "warning"}
                  label={
                    row.status === "ready"
                      ? "Ready"
                      : row.status === "no_tenant"
                        ? "No tenant"
                        : "Review"
                  }
                />
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {rows.some((row) => row.warnings.length > 0) && (
        <ul className="space-y-1 text-sm text-muted">
          {rows.flatMap((row) =>
            row.warnings.map((warning) => (
              <li key={`${row.unitId}-${warning}`}>
                <span className="font-medium text-foreground">{row.unitName}:</span> {warning}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
