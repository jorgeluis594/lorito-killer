import type { Order, OrderItem, Status as OrderStatus } from "@/order/types";
import { response, successResponse } from "@/lib/types";
import prisma from "@/lib/prisma";

import {
  $Enums,
  type Payment as PrismaPayment,
  Prisma,
  type Order as PrismaOrder,
  type OrderItem as PrismaOrderItem,
} from "@prisma/client";
import { Payment, Discount } from "@/order/types";
import PaymentMethod = $Enums.PaymentMethod;
import {
  PRISMA_UNIT_TYPE_MAPPER,
  UNIT_TYPE_MAPPER,
} from "@/product/db_repository";
import { prismaToCustomer } from "@/customer/db_repository";
import { log } from "@/lib/log";

async function addOrderItem(
  orderId: string,
  orderItem: OrderItem,
): Promise<response<OrderItem>> {
  const { productName, productSku, unitType, ...orderItemData } = orderItem;

  try {
    const persistedOrderItem = await prisma().orderItem.create({
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

const STATUS_TO_PRISMA_MAPPER: Record<OrderStatus, $Enums.OrderStatus> = {
  pending: "PENDING",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
};

const PRISMA_TO_STATUS_MAPPER: Record<$Enums.OrderStatus, OrderStatus> = {
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

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

const PRISMA_DISCOUNT_TYPE_MAPPER: Record<
  $Enums.DiscountType,
  Discount["type"]
> = {
  AMOUNT: "amount",
  PERCENT: "percent",
};

const DISCOUNT_TYPE_MAPPER: Record<Discount["type"], $Enums.DiscountType> = {
  amount: "AMOUNT",
  percent: "PERCENT",
};

export const create = async (order: Order): Promise<response<Order>> => {
  try {
    const { orderItems, payments, customer, discount, ...orderData } = order;

    const createdOrderResponse = await prisma().order.create({
      data: {
        ...orderData,
        status: STATUS_TO_PRISMA_MAPPER[order.status],
        discountType: discount ? DISCOUNT_TYPE_MAPPER[discount.type] : null,
        discountValue: discount?.value,
        customerId: customer?.id,
        payments: { create: mapPaymentsToPrisma(payments) as any },
      },
      include: { payments: true },
    });

    const createdOrderItemsResponses = await Promise.all(
      orderItems.map((oi) => addOrderItem(createdOrderResponse.id, oi)),
    );

    const { discountType, discountValue, ...createdOrderData } =
      createdOrderResponse;

    const createdOrder: Order = {
      ...createdOrderData,
      customerId: createdOrderResponse.customerId!,
      companyId: createdOrderResponse.companyId || "some_company_id",
      total: createdOrderResponse.total.toNumber(),
      netTotal: createdOrderResponse.netTotal.toNumber(),
      discountAmount: createdOrderResponse.discountAmount.toNumber(),
      status: order.status,
      documentType: order.documentType,
      payments: createdOrderResponse.payments.map(mapPrismaPaymentToPayment),
      orderItems: [],
      customer: customer,
    };

    if (discountType && discountValue) {
      createdOrder["discount"] = {
        type: PRISMA_DISCOUNT_TYPE_MAPPER[discountType],
        value: discountValue.toNumber(),
      };
    }

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
    const orders = await prisma().order.findMany({});

    return {
      success: true,
      data: await transformOrdersData(orders),
    };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

export const find = async (
  id: string,
  companyId: string,
): Promise<response<Order>> => {
  try {
    const prismaOrder = await prisma().order.findUnique({
      where: { id: id },
      include: { customer: true },
    });
    if (!prismaOrder || prismaOrder.companyId !== companyId) {
      return { success: false, message: "Order not found" };
    }

    const [order] = await transformOrdersData([prismaOrder]);
    if (!order) return { success: false, message: "Order not found" };

    return {
      success: true,
      data: {
        ...order,
        customer: prismaOrder.customer
          ? await prismaToCustomer(prismaOrder.customer)
          : undefined,
      },
    };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

/**
 * Transforms Prisma Order data to the Order data used in the application.
 *
 * @param {PrismaOrder[]} prismaOrders - The orders data fetched from Prisma.
 *
 * @returns {Promise<Order[]>} - Returns a promise that resolves to an array of transformed orders.
 *
 * @throws {Error} - Throws an error if the order status is invalid.
 *
 * @example
 *
 * const prismaOrders = await prisma().order.findMany({});
 * const orders = await transformOrdersData(prismaOrders);
 *
 */
export async function transformOrdersData(
  prismaOrders: PrismaOrder[],
): Promise<Order[]> {
  const prismaOrderItems = await prisma().orderItem.findMany({
    where: { orderId: { in: prismaOrders.map((order) => order.id) } },
  });

  const prismaOrderItemsMap = prismaOrderItems.reduce(
    (acc: Record<string, typeof prismaOrderItems | undefined>, oi) => {
      if (!acc[oi.orderId]) {
        acc[oi.orderId] = [];
      }
      acc[oi.orderId]!.push(oi);

      return acc;
    },
    {},
  );

  const payments = await prisma().payment.findMany({
    where: { orderId: { in: prismaOrders.map((order) => order.id) } },
  });
  const orderPayments = payments.reduce(
    (acc: Record<string, PrismaPayment[]>, payment) => {
      acc[payment.orderId] = [...(acc[payment.orderId] || []), payment];
      return acc;
    },
    {},
  );

  const prismaProducts = await prisma().product.findMany({
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
    if (!isOrderDocumentType(prismaOrder.documentType)) {
      throw new Error(
        `Invalid order documentType: ${prismaOrder.documentType}`,
      );
    }

    const parsedOrderItems = (prismaOrderItemsMap[prismaOrder.id] || []).map(
      (oi: PrismaOrderItem) => {
        const { orderId, ...orderItemData } = oi;
        return {
          ...oi,
          unitType:
            UNIT_TYPE_MAPPER[
              prismaProductsMap[oi.productId].unitType || "UNIT"
            ],
          quantity: oi.quantity.toNumber(),
          productName: prismaProductsMap[oi.productId].name,
          productSku: prismaProductsMap[oi.productId].sku || undefined,
          productPrice: prismaProductsMap[oi.productId].price.toNumber(),
          total: oi.total.toNumber(),
        };
      },
    );

    let discount: Discount | undefined = undefined;
    if (prismaOrder.discountValue && prismaOrder.discountType) {
      discount = {
        type: PRISMA_DISCOUNT_TYPE_MAPPER[prismaOrder.discountType],
        value: prismaOrder.discountValue.toNumber(),
      };
    }

    return {
      ...prismaOrder,
      customerId: prismaOrder.customerId!,
      status: PRISMA_TO_STATUS_MAPPER[prismaOrder.status],
      companyId: prismaOrder.companyId || "some_company_id",
      orderItems: parsedOrderItems,
      payments: (orderPayments[prismaOrder.id] || []).map(
        mapPrismaPaymentToPayment,
      ),
      discount,
      discountAmount: prismaOrder.discountAmount?.toNumber(),
      total: prismaOrder.total.toNumber(),
      netTotal: prismaOrder.netTotal.toNumber(),
      documentType: prismaOrder.documentType,
    };
  });
}

// For now only updates status
export async function update(order: Order): Promise<response<Order>> {
  try {
    await prisma().order.update({
      where: { id: order.id },
      data: { status: STATUS_TO_PRISMA_MAPPER[order.status] },
    });

    return { success: true, data: { ...order } };
  } catch (e: any) {
    log.error("update_order_failed", { order, message: e.message });
    return { success: false, message: e.message };
  }
}

function isOrderDocumentType(
  documentType: any,
): documentType is "invoice" | "receipt" | "ticket" {
  if (documentType === null) return true;

  return (
    documentType === "invoice" ||
    documentType === "receipt" ||
    documentType === "ticket"
  );
}
