import type { Order, OrderItem } from "@/order/types";
import { response, successResponse } from "@/lib/types";
import prisma from "@/lib/prisma";
import { Product } from "@/product/types";
import { $Enums, type Payment as PrismaPayment, Prisma } from "@prisma/client";
import { Payment } from "@/order/types";
import PaymentMethod = $Enums.PaymentMethod;

async function addOrderItem(
  orderId: string,
  orderItem: OrderItem,
): Promise<response<OrderItem>> {
  const { product, ...orderItemData } = orderItem;
  try {
    const persistedOrderItem = await prisma.orderItem.create({
      data: {
        ...orderItemData,
        orderId: orderId,
        productId: orderItem.product.id!,
      },
    });

    return { success: true, data: { ...persistedOrderItem, ...orderItem } };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type PaymentPrismaMatch = Optional<
  PrismaPayment,
  "id" | "orderId" | "createdAt" | "updatedAt" | "data"
>;

function mapPaymentToPrisma(payment: Payment): PaymentPrismaMatch {
  if (payment.method === "cash") {
    const { received_amount, change, ...paymentData } = payment;
    return {
      ...paymentData,
      method: payment.method.toUpperCase() as PaymentMethod,
      amount: new Prisma.Decimal(paymentData.amount),
      data: { received_amount, change },
    };
  } else {
    return {
      ...payment,
      amount: new Prisma.Decimal(payment.amount),
      method: payment.method.toUpperCase() as PaymentMethod,
    };
  }
}

export function mapPrismaPaymentToPayment(
  prismaPayment: PaymentPrismaMatch,
): Payment {
  if (prismaPayment.method === "CASH") {
    return {
      ...prismaPayment,
      amount: prismaPayment.amount.toNumber(),
      method: prismaPayment.method.toLowerCase() as any,
      received_amount: ((prismaPayment.data as any) || {}).received_amount,
      change: ((prismaPayment.data as any) || {}).change,
    };
  } else {
    return {
      ...prismaPayment,
      amount: prismaPayment.amount.toNumber(),
      method: prismaPayment.method.toLowerCase() as any,
    };
  }
}

function mapPaymentsToPrisma(payments: Payment[]): PaymentPrismaMatch[] {
  return payments.map(mapPaymentToPrisma);
}

export const create = async (order: Order): Promise<response<Order>> => {
  try {
    const { orderItems, payments, ...orderData } = order;

    const createdOrderResponse = await prisma.order.create({
      data: {
        ...orderData,
        payments: { create: mapPaymentsToPrisma(payments) as any },
      },
      include: { payments: true },
    });
    const createdOrderItemsResponses = await Promise.all(
      orderItems.map((oi) => addOrderItem(createdOrderResponse.id, oi)),
    );

    const createdOrder: Order = {
      ...createdOrderResponse,
      total: createdOrderResponse.total.toNumber(),
      status: order.status,
      payments: createdOrderResponse.payments.map(mapPrismaPaymentToPayment),
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

export const getOrders = async (): Promise<response<Order[]>> => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    });

    return {
      success: true,
      data: orders.map(transformOrderData),
    };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

export function transformOrderData(prismaOrders: any): Order {
  const { orderItems, payments, ...orderData } = prismaOrders;
  const parsedOrderItems = orderItems.map((oi: any) => {
    const product: Product = {
      ...oi.product,
      price: oi.product.price.toNumber(),
      categories: [],
    };
    return { ...oi, product };
  });

  return {
    ...orderData,
    orderItems: parsedOrderItems,
    payments: payments.map(mapPrismaPaymentToPayment),
  };
}
