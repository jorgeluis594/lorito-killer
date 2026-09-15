export type RoundLineInput = {
  productId: string;
  quantity: number;
  notes?: string;
};

export type OrderRoundView = {
  id: string;
  number: number;
  responsible: { id: string; name: string | null };
  createdAt: Date;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    notes: string | null;
    kitchen: { id: string; name: string } | null;
  }>;
};

export type SendRoundResult = {
  orderId: string;
  roundId: string;
  number: number;
  tableId: string;
  printJobIds: string[];
};
