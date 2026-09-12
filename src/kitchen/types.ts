import type { PreparationStation } from "@/product/types";
import type { OrderItemKitchenStatus } from "@/table/types";

export type KitchenItem = {
  id: string;
  paid?: boolean;
  preparationStation: PreparationStation | null;
  productName: string;
  quantity: number;
  notes?: string | null;
  round: number;
  tableLabel: string;
  status: OrderItemKitchenStatus;
  cancellationReason?: string | null;
  kitchenReadyAt?: Date | null;
  createdAt: Date;
};
