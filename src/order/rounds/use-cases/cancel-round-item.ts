import type { response } from "@/lib/types";
import type { CancelRoundItemInput } from "../schema";

export type OrderItemCancellationResult = {
  id: string;
  orderRoundItemId: string;
  quantity: number;
  reason: string | null;
};

export const cancelRoundItem = (
  input: CancelRoundItemInput & {
    companyId: string;
    userId: string;
    isAdmin: boolean;
  },
  persist: (
    input: CancelRoundItemInput & {
      companyId: string;
      userId: string;
      isAdmin: boolean;
    },
  ) => Promise<response<OrderItemCancellationResult>>,
) => persist(input);
