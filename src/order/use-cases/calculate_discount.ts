import {Order} from "@/order/types";
import {response} from "@/lib/types";
import {div, mul, sub} from "@/lib/utils";

export default function calculateDiscount(order: Order): response<Order> {
  if (!order.discount) return {success: true, data: order};

  if (order.discount.type == 'amount') {
    const discountAmount = order.discount.value
    return {success: true, data: {...order, discountAmount, total: sub(order.netTotal)(discountAmount)}}
  }

  if (order.discount.type == 'percent') {
    const discountAmount = mul(order.netTotal)(div(order.discount.value)(100))
    return {success: true, data: {...order, discountAmount, total: sub(order.netTotal)(discountAmount)}}
  }

  return {success: false, message: "Invalid discount type"}
}