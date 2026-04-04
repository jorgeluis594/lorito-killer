"use server";

import { Order } from "./types";
import { response } from "@/lib/types";
import { create as createOrder } from "./db_repository";
import { revalidatePath } from "next/cache";
import { getLastOpenCashShift } from "@/cash-shift/db_repository";
import { getCompany as findCompany } from "@/company/db_repository";
import { find as findProduct } from "@/product/db_repository";
import {
  updateStock as UpdateStockFromStockTransfer,
  create as createStockTransfer,
} from "@/stock-transfer/db_repository";
import { updateStock } from "@/order/use-cases/update-stock";
import { Company } from "@/company/types";
import { buildAndPersistDocument } from "@/document/use_cases/build-and-persist-document";
import {
  createDocument as saveDocument,
  getLatestDocumentNumber,
  getBillingCredentialsFor,
} from "@/document/db_repository";
import type { Document } from "@/document/types";
import { withinTransaction } from "@/lib/prisma";
import calculateDiscount from "@/order/use-cases/calculate_discount";
import { log } from "@/lib/log";
import cancel from "@/order/use-cases/cancel";
import { documentQueue } from "@/lib/queue/queues/document.queue";
import {
  protectedAction,
  requirePermission,
} from "@/authorization/server";

export const create = protectedAction(
  { resource: "orders", action: "create" },
  async (
    user,
    userId: string,
    order: Order,
  ): Promise<response<{ order: Order; document: Document }>> => {
    // Check if company is active
    const companyResponse = await findCompany(user.companyId);
    if (!companyResponse.success || !companyResponse.data.active) {
      return {
        success: false,
        message:
          "Tu suscripción presenta un pago pendiente. Actualiza tu situación para seguir usando el servicio.",
        type: "CompanyInactive",
      };
    }

    const openCashShiftResponse = await getLastOpenCashShift(user.id);
    const billingCredentialsResponse = await getBillingCredentialsFor(
      user.companyId,
    );
    if (!billingCredentialsResponse.success) {
      return {
        success: false,
        message: "No se encontraron credenciales de facturación",
      };
    }

    if (!openCashShiftResponse.success) {
      return { success: false, message: "No tienes una caja abierta" };
    }

    const openCashShift = openCashShiftResponse.data;
    if (openCashShift.id !== order.cashShiftId) {
      log.warn("order_cash_shift_mismatch", {
        orderCashShiftId: order.cashShiftId,
        lastOpenCashShiftId: openCashShift.id,
      });
      order.cashShiftId = openCashShift.id;
    }

    if (openCashShift.userId !== user.id) {
      return {
        success: false,
        message: "La caja abierta no pertenece al usuario",
      };
    }

    const discountResponse = calculateDiscount(order);
    if (!discountResponse.success) {
      return { success: false, message: "Error generando descuento" };
    }

    return withinTransaction<{ order: Order; document: Document }>(
      async function () {
        const createOrderResponse = await createOrder({
          ...discountResponse.data,
          cashShiftId: openCashShift.id,
          companyId: user.companyId,
        });
        if (!createOrderResponse.success) {
          log.error("create_order_failed", {});
          return createOrderResponse;
        }

        revalidatePath("/api/orders");
        const updateStockResponse = await updateStock(userId, order, {
          findProduct,
          createStockTransfer,
          updateStock: UpdateStockFromStockTransfer,
        });

        if (!updateStockResponse.success) {
          return updateStockResponse;
        }

        const { billingToken, ...billingSettings } =
          billingCredentialsResponse.data;

        // Build and persist document
        const documentResponse = await buildAndPersistDocument(
          {
            createDocument: saveDocument,
            getLastDocumentNumber: getLatestDocumentNumber,
          },
          createOrderResponse.data,
          billingSettings,
        );
        if (!documentResponse.success) {
          return documentResponse;
        }

        // Trigger async tax entity submission (slow operation)
        try {
          await documentQueue.add("send-to-tax-entity", {
            orderId: createOrderResponse.data.id!,
            companyId: user.companyId,
            documentId: documentResponse.data.id,
          });
        } catch (error) {
          log.error("document_send_to_tax_entity_failed", {
            error,
          });
        }

        return {
          success: true,
          data: {
            order: { ...createOrderResponse.data },
            document: { ...documentResponse.data },
          },
        };
      },
    );
  },
);

export const getCompany = protectedAction(
  { resource: "orders", action: "read" },
  async (user): Promise<response<Company>> => {
    return await findCompany(user.companyId);
  },
);

export const cancelOrder = protectedAction(
  { resource: "orders", action: "delete" },
  async (
    _user,
    order: Order,
    cancellationReason: string,
  ): Promise<response<Order>> => {
    return cancel(order, cancellationReason);
  },
);
