import type { Order, OrderItem } from "@/order/types";
import { response, successResponse } from "@/lib/types";
import prisma from "@/lib/prisma";

async function addOrderItem(
  order: Order,
  orderItem: OrderItem,
): Promise<response<OrderItem>> {
  const { product, ...orderItemData } = orderItem;
  try {
    const persistedOrderItem = await prisma.orderItem.create({
      data: {
        ...orderItemData,
        orderId: order.id!,
        productId: orderItem.product.id!,
      },
    });

    return { success: true, data: { ...orderItem } };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export const create = async (order: Order): Promise<response<Order>> => {
  try {
    const { orderItems, ...orderData } = order;

    const createdOrderResponse = await prisma.order.create({
      data: {
        ...orderData,
      },
    });

    const createdOrderItemsResponses = await Promise.all(
      orderItems.map((oi) => addOrderItem(order, oi)),
    );

    const createdOrder: Order = {
      ...createdOrderResponse,
      total: createdOrderResponse.total.toNumber(),
      status: order.status,
      orderItems: [],
    };
    createdOrder.orderItems = createdOrderItemsResponses
      .filter((oi): oi is successResponse<OrderItem> => oi.success)
      .map((oi) => oi.data);

    return { success: true, data: createdOrder };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};
