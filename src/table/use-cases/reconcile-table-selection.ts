import type { TableWithSession } from "../types";

type SelectableTable = Pick<TableWithSession, "id" | "activeSession">;

export function reconcileSelectedTableId(
  tables: SelectableTable[],
  selectedTableId: string | null,
): string | null {
  if (!selectedTableId) return null;
  const selectedTable = tables.find((table) => table.id === selectedTableId);
  return selectedTable?.activeSession ? selectedTableId : null;
}
