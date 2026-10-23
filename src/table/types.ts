export type TableSessionStatus =
  | "OPEN"
  | "BILL_REQUESTED"
  | "CLOSED"
  | "CANCELLED";
export type TableDerivedStatus = "AVAILABLE" | "OCCUPIED" | "BILL_REQUESTED";
export type OrderType = "RETAIL" | "DINE_IN" | "TAKE_AWAY" | "DELIVERY";
export type RoundItem = {
  productId: string;
  quantity: number;
  notes?: string;
};
export type TableOrderItem = {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  total: number;
  notes?: string | null;
  round: number;
};

export type TableOrder = {
  id: string;
  orderItems: TableOrderItem[];
  rounds?: Array<{
    id: string;
    number: number;
    createdAt: Date;
    responsible: { id: string; name?: string | null };
    items: Array<{
      id: string;
      orderItemId: string;
      quantity: number;
      cancelledQuantity: number;
      kitchen: { id: string; name: string } | null;
    }>;
  }>;
};

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
  draft?: TableDraftItem[];
  draftRevision?: number;
  id: string;
  companyId: string;
  /** Null en delivery y para llevar: sesiones sin mesa. */
  tableId: string | null;
  table?: Table;
  waiterId: string;
  waiter?: { id: string; name?: string | null };
  status: TableSessionStatus;
  current: boolean | null;
  guestCount?: number | null;
  notes?: string | null;
  cancellationReason?: string | null;
  /** Solo Para llevar: a nombre de quién va. Delivery usa `delivery.name`. */
  customerName: string | null;
  order?: TableOrder | null;
  orderId?: string | null;
  orderType?: OrderType;
  /** `Order.updatedAt`: versión para editar los datos de entrega. */
  orderVersion?: string;
  total?: number;
  paymentStatus?: "PENDING" | "PAID";
  delivery?: SessionDelivery | null;
  currentRound: number;
  openedAt: Date;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionDelivery = {
  status: "PENDING" | "DISPATCHED" | "DELIVERED";
  name: string | null;
  phone: string;
  address: string;
  reference: string | null;
  fee: number;
  dispatchedAt: Date | null;
};

export type TableDraftItem = {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  notes?: string;
};

export type TableWithSession = Table & {
  activeSession: TableSession | null;
};

export type TableConfiguration = {
  tables: Array<
    Pick<Table, "id" | "number" | "label"> & { inService: boolean }
  >;
  nextNumber: number;
};

export function getTableDerivedStatus(table: Table): TableDerivedStatus {
  if (!table.activeSession) return "AVAILABLE";
  const { status, draft, order } = table.activeSession;
  if (status === "BILL_REQUESTED") return "BILL_REQUESTED";
  // An opened table stays available until a product is added.
  return draft?.length || order?.orderItems.length ? "OCCUPIED" : "AVAILABLE";
}
