import { Discountable, Order } from "@/order/types";
import { response } from "@/lib/types";
import { div, mul, sub } from "@/lib/utils";

export default function calculateDiscount<T extends Discountable>(
  discountAble: T,
): response<T> {
  if (!discountAble.discount)
    return {
      success: true,
      data: {
        ...discountAble,
        total: discountAble.netTotal,
        discountAmount: 0,
      },
    };

  if (discountAble.discount.type == "amount") {
    const discountAmount = discountAble.discount.value;

    // Improve this, move to a validation function
    if (discountAmount > discountAble.netTotal) {
      return {
        success: false,
        message: "El descuento no puede ser mayor al total",
      };
    }

    return {
      success: true,
      data: {
        ...discountAble,
        discountAmount,
        total: sub(discountAble.netTotal)(discountAmount),
      },
    };
  }

  if (discountAble.discount.type == "percent") {
    const discountAmount = mul(discountAble.netTotal)(
      div(discountAble.discount.value)(100),
    );

    // Improve this, move to a validation function
    if (discountAmount > discountAble.netTotal) {
      return {
        success: false,
        message: "El descuento no puede ser mayor al total",
      };
    }

    return {
      success: true,
      data: {
        ...discountAble,
        discountAmount,
        total: sub(discountAble.netTotal)(discountAmount),
      },
    };
  }

  return { success: false, message: "Tipo de descuento invalido" };
}
