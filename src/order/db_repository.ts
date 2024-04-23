import type { Order, OrderItem } from "@/order/types";
import { response, successResponse } from "@/lib/types";
import prisma from "@/lib/prisma";
import { Product } from "@/product/types";
import {
  $Enums,
  type Payment as PrismaPayment,
  Prisma,
  type Order as PrismaOrder,
  type OrderItem as PrismaOrderItem,
} from "@prisma/client";
import { Payment } from "@/order/types";
import PaymentMethod = $Enums.PaymentMethod;

async function addOrderItem(
  orderId: string,
  orderItem: OrderItem,
): Promise<response<OrderItem>> {
  const { productName, ...orderItemData } = orderItem;
  try {
    const persistedOrderItem = await prisma.orderItem.create({
      data: {
        ...orderItemData,
        orderId,
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
  } else if (payment.method == "wallet") {
    const { name, operationCode, ...paymentData } = payment;
    return {
      ...paymentData,
      method: payment.method.toUpperCase() as PaymentMethod,
      amount: new Prisma.Decimal(payment.amount),
      data: {
        operationCode: operationCode,
        name: name,
      },
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
  } else if (prismaPayment.method === "WALLET") {
    return {
      ...prismaPayment,
      amount: prismaPayment.amount.toNumber(),
      method: prismaPayment.method.toLowerCase() as any,
      operationCode: ((prismaPayment.data as any) || {}).operationCode,
      name: ((prismaPayment.data as any) || {}).name,
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
    const orders = await prisma.order.findMany({});

    return {
      success: true,
      data: await transformOrdersData(orders),
    };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

export async function transformOrdersData(
  prismaOrders: PrismaOrder[],
): Promise<Order[]> {
  const prismaOrderItems = await prisma.orderItem.findMany({
    where: { orderId: { in: prismaOrders.map((order) => order.id) } },
  });

  const prismaOrderItemsMap = prismaOrderItems.reduce(
    (acc: Record<string, typeof prismaOrderItems>, oi) => {
      if (!acc[oi.orderId]) {
        acc[oi.orderId] = [];
      }
      acc[oi.orderId].push(oi);

      return acc;
    },
    {},
  );

  const payments = await prisma.payment.findMany({
    where: { orderId: { in: prismaOrders.map((order) => order.id) } },
  });
  const orderPayments = payments.reduce(
    (acc: Record<string, PrismaPayment[]>, payment) => {
      acc[payment.orderId] = [...(acc[payment.orderId] || []), payment];
      return acc;
    },
    {},
  );

  const prismaProducts = await prisma.product.findMany({
    where: { id: { in: prismaOrderItems.map((oi) => oi.productId) } },
  });

  const prismaProductsMap = prismaProducts.reduce(
    (acc: Record<string, (typeof prismaProducts)[0]>, product) => {
      acc[product.id] = product;
      return acc;
    },
    {},
  );

  return prismaOrders.map((prismaOrder: PrismaOrder) => {
    if (!isOrderStatus(prismaOrder.status)) {
      throw new Error(`Invalid order status: ${prismaOrder.status}`);
    }

    const parsedOrderItems = prismaOrderItemsMap[prismaOrder.id].map(
      (oi: PrismaOrderItem) => {
        const { orderId, ...orderItemData } = oi;
        return {
          ...oi,
          productName: prismaProductsMap[oi.productId].name,
          productPrice: prismaProductsMap[oi.productId].price.toNumber(),
          total: oi.total.toNumber(),
        };
      },
    );

    return {
      ...prismaOrder,
      orderItems: parsedOrderItems,
      payments: (orderPayments[prismaOrder.id] || []).map(
        mapPrismaPaymentToPayment,
      ),
      total: prismaOrder.total.toNumber(),
      status: prismaOrder.status,
    };
  });
}

function isOrderStatus(
  status: any,
): status is "pending" | "completed" | "cancelled" {
  return (
    status === "pending" || status === "completed" || status === "cancelled"
  );
}
