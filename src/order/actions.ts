"use server";

import { Order, OrderItem } from "./types";
import { response } from "@/lib/types";
import { create as createOrder } from "./db_repository";
import { revalidatePath } from "next/cache";
import { getLastOpenCashShift } from "@/cash-shift/db_repository";
import { getCompany as findCompany } from "@/company/db_repository";
import {
  find as findProduct,
  update as updateProduct,
} from "@/product/db_repository";
import { getSession } from "@/lib/auth";
import { PackageProductType, Product, SingleProduct } from "@/product/types";
import { Company } from "@/company/types";

export const create = async (data: Order): Promise<response<Order>> => {
  // TODO: Implement order creator use case to manage the creation of an order logic
  const session = await getSession();
  const openCashShiftResponse = await getLastOpenCashShift(session.user.id);
  if (!openCashShiftResponse.success) {
    return { success: false, message: "No tienes una caja abierta" };
  }

  const openCashShift = openCashShiftResponse.data;

  if (openCashShift.id !== data.cashShiftId) {
    return {
      success: false,
      message: "La caja abierta no coincide con la caja de la venta",
    };
  }

  if (openCashShift.userId !== session.user.id) {
    return {
      success: false,
      message: "La caja abierta no pertenece al usuario",
    };
  }

  const createOrderResponse = await createOrder({
    ...data,
    cashShiftId: openCashShift.id,
    companyId: session.user.companyId,
  });
  if (createOrderResponse.success) {
    revalidatePath("/api/orders");
    await updateProductsStocks(createOrderResponse.data);
  }

  return createOrderResponse;
};

async function updateProductsStocks(order: Order) {
  const productsIds = order.orderItems.map((oi) => oi.productId);
  const productsResponse = await Promise.all(
    productsIds.map((id) => findProduct(id)),
  );
  const orderItemsByProductMapper = order.orderItems.reduce(
    (acc: Record<string, OrderItem>, oi) => {
      acc[oi.productId] = oi;
      return acc;
    },
    {},
  );

  const products = productsResponse
    .filter((r) => r.success)
    .map((r) => (r.success && r.data) as Product);

  await Promise.all(
    products.map(async (product) => {
      // TODO: Handle the logic of stock discount on package products
      if (product.type === PackageProductType) {
        await Promise.all(
          product.productItems.map(async (pi) => {
            const childProductResponse = await findProduct(pi.productId);
            if (!childProductResponse.success) return;

            const childProduct = childProductResponse.data as SingleProduct;
            await updateProduct({
              ...childProduct,
              stock:
                childProduct.stock -
                orderItemsByProductMapper[product.id!].quantity * pi.quantity,
            });
          }),
        );

        return;
      }

      await updateProduct({
        ...product,
        stock: product.stock - orderItemsByProductMapper[product.id!].quantity,
      });
    }),
  );
}

export const getCompany = async (): Promise<response<Company>> => {
  const session = await getSession();
  return await findCompany(session.user.companyId);
};
