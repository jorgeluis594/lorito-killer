import type { response } from "@/lib/types";

type CancelPendingOrderItem = (input: {
  orderItemId: string;
  companyId: string;
  userId: string;
  reason: string;
}) => Promise<response<void>>;

export async function cancelOrderItem(
  input: {
    orderItemId: string;
    companyId: string;
    userId: string;
    reason: string;
  },
  cancelPendingOrderItem: CancelPendingOrderItem,
): Promise<response<void>> {
  const reason = input.reason.trim();
  if (!reason)
    return { success: false, message: "El motivo de cancelacion es requerido" };

  return cancelPendingOrderItem({ ...input, reason });
}
