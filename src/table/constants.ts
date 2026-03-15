import type { TableDerivedStatus, TableSessionStatus } from "./types";

export const TABLE_STATUS_COLORS: Record<TableDerivedStatus, string> = {
  AVAILABLE: "bg-emerald-500",
  OCCUPIED: "bg-red-500",
  BILL_REQUESTED: "bg-amber-500",
};

export const TABLE_STATUS_TEXT_COLORS: Record<TableDerivedStatus, string> = {
  AVAILABLE: "text-emerald-600 dark:text-emerald-400",
  OCCUPIED: "text-red-600 dark:text-red-400",
  BILL_REQUESTED: "text-amber-600 dark:text-amber-400",
};

export const TABLE_STATUS_BORDER_COLORS: Record<TableDerivedStatus, string> = {
  AVAILABLE: "border-emerald-500",
  OCCUPIED: "border-red-500",
  BILL_REQUESTED: "border-amber-500",
};

export const TABLE_STATUS_BG_LIGHT: Record<TableDerivedStatus, string> = {
  AVAILABLE: "bg-card",
  OCCUPIED: "bg-red-50/50 dark:bg-red-950/20",
  BILL_REQUESTED: "bg-amber-50/50 dark:bg-amber-950/20",
};

export const TABLE_STATUS_STRIPE: Record<TableDerivedStatus, string> = {
  AVAILABLE: "border-t-emerald-500",
  OCCUPIED: "border-t-red-500",
  BILL_REQUESTED: "border-t-amber-500",
};

export const TABLE_STATUS_LABELS: Record<TableDerivedStatus, string> = {
  AVAILABLE: "Libre",
  OCCUPIED: "Ocupada",
  BILL_REQUESTED: "Cuenta Pedida",
};

export const SESSION_STATUS_LABELS: Record<TableSessionStatus, string> = {
  OPEN: "Abierta",
  BILL_REQUESTED: "Cuenta Pedida",
  CLOSED: "Cerrada",
  CANCELLED: "Cancelada",
};

export const TIME_URGENCY_THRESHOLDS = {
  NORMAL_MAX_MINUTES: 15,
  WARNING_MAX_MINUTES: 30,
} as const;

export function getTimeUrgencyClass(minutes: number): string {
  if (minutes >= TIME_URGENCY_THRESHOLDS.WARNING_MAX_MINUTES) {
    return "text-red-600 dark:text-red-400 font-bold";
  }
  if (minutes >= TIME_URGENCY_THRESHOLDS.NORMAL_MAX_MINUTES) {
    return "text-amber-600 dark:text-amber-400";
  }
  return "text-muted-foreground";
}

export const MAX_TABLE_CAPACITY = 20;
export const MAX_TABLES_PER_ZONE = 50;
export const MAX_ZONES = 10;
