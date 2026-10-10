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
  documentType: "ticket" | "receipt" | "invoice";
};

export async function findFulfillmentCashShift(companyId: string) {
  return prisma().cashShift.findFirst({
    where: {
      companyId,
      status: "OPEN",
      user: { role: { in: ["ADMIN", "CASHIER"] }, active: true },
    },
    orderBy: [{ openedAt: "desc" }, { id: "asc" }],
    select: { id: true },
  });
}

// Reintentos acotados de la transacción completa ante conflictos de
// serialización (cobros simultáneos de la misma serie o del mismo pedido).
const MAX_SERIALIZATION_RETRIES = 4;

// Prisma informa 40001 como P2034 en operaciones del modelo y como P2010 en
// consultas crudas (el `FOR UPDATE` del pedido).
const isSerializationConflict = (error: unknown) => {
  const { code, message } = error as { code?: string; message?: string };
  return code === "P2034" || (code === "P2010" && !!message?.includes("40001"));
};

const reject = (message: string): never => {
  throw new Error(message);
};

// Repite la transacción completa ante conflictos de serialización, con un
// pequeño jitter para no repetir el choque en el mismo instante.
async function withSerializationRetry<T>(
  run: () => Promise<response<T>>,
): Promise<response<T>> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (isSerializationConflict(error)) {
        if (attempt < MAX_SERIALIZATION_RETRIES) {
          await new Promise((resolve) =>
            setTimeout(resolve, 5 + Math.random() * 20 * (attempt + 1)),
          );
          continue;
        }
        return {
          success: false,
          message: "El pedido cambió. Consulta su estado antes de reintentar.",
        };
      }
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cobrar el pedido.",
      };
    }
  }
}

const receiptKind = (documentType: string) =>
  documentType.toLowerCase() as FulfillmentPaymentResult["documentType"];

const METHOD_NAMES = {
  cash: "CASH",
  wallet: "WALLET",
  credit_card: "CREDIT_CARD",
  debit_card: "DEBIT_CARD",
} as const;

/** ¿La solicitud describe el mismo cobro inicial ya persistido? */
function sameCollection(
  input: FulfillmentPaymentInput,
  persisted: {
    documentType: string;
    payments: { method: string }[];
    customer: {
      documentType: string | null;
      documentNumber: string | null;
    } | null;
  },
) {
  if (persisted.documentType.toLowerCase() !== input.receipt.documentType)
    return false;
  const wanted =
    input.method === "combine"
      ? Object.entries(input.contributions ?? {})
          .filter(([, amount]) => amount)
          .map(([method]) => METHOD_NAMES[method as keyof typeof METHOD_NAMES])
      : [METHOD_NAMES[input.method]];
  const actual = persisted.payments.map((payment) => payment.method);
  if ([...wanted].sort().join() !== [...actual].sort().join()) return false;
  const customer = input.receipt.customer;
  if (!customer) return !persisted.customer;
  return (
    persisted.customer?.documentType === customer.documentType &&
    persisted.customer?.documentNumber === customer.documentNumber
  );
}

export async function payFulfillmentOrder(
  user: AuthorizedUser,
  input: FulfillmentPaymentInput,
): Promise<response<FulfillmentPaymentResult>> {
  return withSerializationRetry(() =>
    prisma().$transaction(
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
            customer: true,
            delivery: { select: { fee: true } },
            orderItems: { include: { product: true } },
          },
        });
        if (!order) return reject("El pedido no está disponible.");
        if (order.paymentStatus === "PAID" && order.documents[0]) {
          const existing = order.documents[0];
          if (
            !sameCollection(input, {
              documentType: existing.documentType,
              payments: order.payments,
              customer: order.customer,
            })
          )
            return reject("El pedido ya fue cobrado con otro comprobante.");
          return {
            success: true,
            data: {
              orderId: order.id,
              documentId: existing.id,
              total: order.total.toNumber(),
              paymentStatus: "PAID",
              documentType: receiptKind(existing.documentType),
            },
          };
        }
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
          deliveryFee: order.delivery?.fee.toNumber(),
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
            documentType: receipt.documentType,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      },
    ),
  );
}
