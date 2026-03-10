import type { TableDerivedStatus } from "./types";

export const TABLE_STATUS_COLORS: Record<TableDerivedStatus, string> = {
  AVAILABLE: "bg-green-500",
  OCCUPIED: "bg-red-500",
  BILL_REQUESTED: "bg-yellow-500",
};

export const TABLE_STATUS_TEXT_COLORS: Record<TableDerivedStatus, string> = {
  AVAILABLE: "text-green-600",
  OCCUPIED: "text-red-600",
  BILL_REQUESTED: "text-yellow-600",
};

export const TABLE_STATUS_BORDER_COLORS: Record<TableDerivedStatus, string> = {
  AVAILABLE: "border-green-500",
  OCCUPIED: "border-red-500",
  BILL_REQUESTED: "border-yellow-500",
};

export const TABLE_STATUS_BG_LIGHT: Record<TableDerivedStatus, string> = {
  AVAILABLE: "bg-green-50",
  OCCUPIED: "bg-red-50",
  BILL_REQUESTED: "bg-yellow-50",
};

export const TABLE_STATUS_LABELS: Record<TableDerivedStatus, string> = {
  AVAILABLE: "Libre",
  OCCUPIED: "Ocupada",
  BILL_REQUESTED: "Cuenta Pedida",
};

export const SESSION_STATUS_LABELS: Record<string, string> = {
  OPEN: "Abierta",
  BILL_REQUESTED: "Cuenta Pedida",
  CLOSED: "Cerrada",
  CANCELLED: "Cancelada",
};

export const MAX_TABLE_CAPACITY = 20;
export const MAX_TABLES_PER_ZONE = 50;
export const MAX_ZONES = 10;
