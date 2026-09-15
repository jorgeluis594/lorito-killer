import { Prisma } from "@prisma/client";
import type { AuthorizedUser } from "@/authorization/server";
import { buildAndPersistDocument } from "@/document/use_cases/build-and-persist-document";
import {
  createDocument,
  getLatestDocumentNumber,
} from "@/document/db_repository";
import type { BillingCredentials } from "@/document/types";
import prisma from "@/lib/prisma";
import type { response } from "@/lib/types";
import type { Order, Payment } from "./types";
import { mapReceiptPrintOrderItem } from "./db_repository";
import { validatePayments } from "./use-cases/split-payments";
import { walletPaymentDetailsSchema } from "./wallet-payment";
import type { FulfillmentPaymentInput } from "./fulfillment-payment-schema";

export type FulfillmentPaymentResult = {
  orderId: string;
  documentId: string;
  total: number;
  paymentStatus: "PAID";
};

const reject = (message: string): never => {
  throw new Error(message);
};

export async function payFulfillmentOrder(
  user: AuthorizedUser,
  input: FulfillmentPaymentInput,
): Promise<response<FulfillmentPaymentResult>> {
  try {
    return await prisma().$transaction(
      async (db) => {
        await db.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId} FOR UPDATE`;
        const order = await db.order.findFirst({
          where: {
            id: input.orderId,
            companyId: user.companyId,
            orderType: { in: ["TAKE_AWAY", "DELIVERY"] },
          },
          include: {
            payments: true,
            documents: true,
            orderItems: { include: { product: true } },
          },
        });
        if (!order) return reject("El pedido no está disponible.");
        if (order.paymentStatus === "PAID" && order.documents[0])
          return {
            success: true,
            data: {
              orderId: order.id,
              documentId: order.documents[0].id,
              total: order.total.toNumber(),
              paymentStatus: "PAID",
            },
          };
        if (
          order.status !== "PENDING" ||
          order.payments.length ||
          order.documents.length ||
          order.updatedAt.toISOString() !== input.orderVersion ||
          !order.total.equals(input.expectedTotal)
        )
          return reject("El pedido cambió. Revisa el total antes de cobrar.");
        if (!order.orderItems.some((item) => item.quantity.gt(0)))
          return reject("El pedido no tiene productos para cobrar.");

        const [company, shift] = await Promise.all([
          db.company.findUnique({ where: { id: user.companyId } }),
          db.cashShift.findFirst({
            where: {
              id: input.cashShiftId,
              companyId: user.companyId,
              status: "OPEN",
              user: { role: { in: ["ADMIN", "CASHIER"] }, active: true },
            },
          }),
        ]);
        if (!company?.active || !shift)
          return reject("No hay una caja autorizada abierta para el cobro.");
        await db.$queryRaw`SELECT id FROM "CashShift" WHERE id = ${shift.id} AND status = 'OPEN' FOR UPDATE`;
        const config = {
          ticketSerialNumber: "NV01",
          ...(company.billingCredentials as unknown as Partial<BillingCredentials>),
        } as BillingCredentials;
        const receipt = input.receipt;
        if (
          (receipt.documentType === "invoice" && !config.invoiceSerialNumber) ||
          (receipt.documentType === "receipt" && !config.receiptSerialNumber)
        )
          return reject("El comprobante elegido no está configurado.");
        let customerId: string | null = null;
        if (receipt.documentType !== "ticket" && receipt.customer) {
          const customer = await db.customer.create({
            data: { ...receipt.customer, companyId: user.companyId },
          });
          customerId = customer.id;
        }

        const amounts =
          input.method === "combine"
            ? input.contributions
            : { [input.method]: order.total.toNumber() };
        if (!amounts) return reject("Ingresa los importes del pago combinado.");
        const payments: Payment[] = [];
        for (const [method, amount] of Object.entries(amounts)) {
          if (!amount) continue;
          const base = { amount, cashShiftId: shift.id };
          if (method === "cash") {
            if (input.cashReceived === undefined || input.cashReceived < amount)
              return reject("El efectivo recibido debe cubrir el pago.");
            payments.push({
              ...base,
              method: "cash",
              received_amount: input.cashReceived,
              change: new Prisma.Decimal(input.cashReceived)
                .minus(amount)
                .toNumber(),
            });
          } else if (method === "wallet") {
            const details = walletPaymentDetailsSchema.safeParse(input.wallet);
            if (!details.success)
              return reject(details.error.issues[0].message);
            payments.push({ ...base, method: "wallet", ...details.data });
          } else if (method === "credit_card" || method === "debit_card") {
            payments.push({ ...base, method });
          }
        }
        const validation = validatePayments(order.total.toNumber(), payments);
        if (!validation.success) return reject(validation.message);
        if (input.method === "combine" && payments.length < 2)
          return reject("El pago combinado requiere al menos dos medios.");

        const domainOrder: Order = {
          id: order.id,
          companyId: user.companyId,
          customerId: customerId ?? undefined,
          cashShiftId: shift.id,
          sellerId: order.sellerId,
          documentType: receipt.documentType,
          status: "pending",
          paymentStatus: "paid",
          orderType: order.orderType,
          createdAt: order.createdAt,
          total: order.total.toNumber(),
          netTotal: order.netTotal.toNumber(),
          discountAmount: order.discountAmount.toNumber(),
          payments,
          orderItems: order.orderItems
            .filter((item) => item.quantity.gt(0))
            .map(mapReceiptPrintOrderItem),
        };
        await db.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
            cashShiftId: shift.id,
            customerId,
            documentType: receipt.documentType,
          },
        });
        for (const payment of payments) {
          await db.payment.create({
            data: {
              orderId: order.id,
              cashShiftId: shift.id,
              amount: payment.amount,
              method:
                payment.method.toUpperCase() as Prisma.PaymentCreateInput["method"],
              data: {
                confirmedById: user.id,
                source:
                  order.orderType === "DELIVERY" ? "delivery" : "take_away",
                ...(payment.method === "cash"
                  ? {
                      received_amount: payment.received_amount,
                      change: payment.change,
                    }
                  : payment.method === "wallet"
                    ? {
                        name: payment.name ?? null,
                        operationCode: payment.operationCode ?? null,
                      }
                    : {}),
              },
            },
          });
        }
        const document = await buildAndPersistDocument(
          {
            createDocument: (value) => createDocument(value, db),
            getLastDocumentNumber: (companyId, series) =>
              getLatestDocumentNumber(companyId, series, db),
          },
          domainOrder,
          config,
        );
        if (!document.success)
          return reject("No se pudo generar el comprobante.");
        if (receipt.documentType !== "ticket")
          await db.documentTaxDispatch.create({
            data: { documentId: document.data.id, companyId: user.companyId },
          });
        return {
          success: true,
          data: {
            orderId: order.id,
            documentId: document.data.id,
            total: order.total.toNumber(),
            paymentStatus: "PAID",
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      },
    );
  } catch (error) {
    return {
      success: false,
      message:
        (error as { code?: string }).code === "P2034"
          ? "El pedido cambió. Consulta su estado antes de reintentar."
          : error instanceof Error
            ? error.message
            : "No se pudo cobrar el pedido.",
    };
  }
}
