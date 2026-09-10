import type { OrderItemKitchenStatus } from "@/table/types";

export type KitchenItem = {
  id: string;
  productName: string;
  quantity: number;
  notes?: string | null;
  round: number;
  tableLabel: string;
  status: OrderItemKitchenStatus;
  cancellationReason?: string | null;
  createdAt: Date;
};
