import type { TableSessionStatus } from "../types";

const VALID_TRANSITIONS: Record<TableSessionStatus, TableSessionStatus[]> = {
  OPEN: ["BILL_REQUESTED", "CANCELLED"],
  BILL_REQUESTED: ["CLOSED", "OPEN", "CANCELLED"],
  CLOSED: [],
  CANCELLED: [],
};

export function isValidTransition(
  from: TableSessionStatus,
  to: TableSessionStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getTransitionError(
  from: TableSessionStatus,
  to: TableSessionStatus,
): string | null {
  if (isValidTransition(from, to)) return null;

  if (from === "CLOSED") return "No se puede modificar una sesion cerrada";
  if (from === "CANCELLED") return "No se puede modificar una sesion cancelada";

  return `No se puede cambiar de ${from} a ${to}`;
}
