import { OrderItem } from "@/order/types";
import { response } from "@/lib/types";
import { mul } from "@/lib/utils";
import calculateDiscount from "@/order/use-cases/calculate_discount";

export default function calculateOrderItemTotals(
  orderItem: OrderItem,
): response<OrderItem> {
  const netTotal = mul(orderItem.quantity)(orderItem.productPrice);
  const calculateDiscountResponse = calculateDiscount({
    ...orderItem,
    netTotal,
  });
  if (!calculateDiscountResponse.success) {
    return calculateDiscountResponse;
  }

  return { success: true, data: { ...calculateDiscountResponse.data } };
}
