import type { Order } from "@/order/types";

export type TableSessionStatus = "OPEN" | "BILL_REQUESTED" | "CLOSED" | "CANCELLED";
export type TableDerivedStatus = "AVAILABLE" | "OCCUPIED" | "BILL_REQUESTED";
export type OrderType = "RETAIL" | "DINE_IN" | "TAKE_AWAY" | "DELIVERY";

export type Zone = {
  id: string;
  companyId: string;
  name: string;
  order: number;
  active: boolean;
  tables?: Table[];
  createdAt: Date;
  updatedAt: Date;
};

export type Table = {
  id: string;
  companyId: string;
  number: number;
  label?: string | null;
  capacity: number;
  zoneId: string;
  zone?: Zone;
  active: boolean;
  activeSession?: TableSession | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TableSession = {
  id: string;
  companyId: string;
  tableId: string;
  table?: Table;
  waiterId: string;
  waiter?: { id: string; name?: string | null };
  status: TableSessionStatus;
  current: boolean | null;
  guestCount?: number | null;
  notes?: string | null;
  order?: Order | null;
  orderId?: string | null;
  currentRound: number;
  openedAt: Date;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TableWithSession = Table & {
  activeSession: TableSession | null;
};

export function getTableDerivedStatus(table: Table): TableDerivedStatus {
  if (!table.activeSession) return "AVAILABLE";
  if (table.activeSession.status === "BILL_REQUESTED") return "BILL_REQUESTED";
  return "OCCUPIED";
}
