import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { response } from "@/lib/types";
import type { AuthorizedUser } from "@/authorization/server";
import type { Payment, Order } from "@/order/types";
import { mapReceiptPrintOrderItem } from "@/order/db_repository";
import { validatePayments } from "@/order/use-cases/split-payments";
import { walletPaymentDetailsSchema } from "@/order/wallet-payment";
import { buildAndPersistDocument } from "@/document/use_cases/build-and-persist-document";
import {
  createDocument,
  getLatestDocumentNumber,
} from "@/document/db_repository";
import type { BillingCredentials } from "@/document/types";
import { generateOrderStocksTransfers } from "@/stock-transfer/use-cases/generate-order-stock-transfer";
import { find as findProduct } from "@/product/db_repository";
import type { TablePaymentInput, TableReceiptInput } from "./payment-schema";

const include = {
  table: true,
  order: {
    include: {
      customer: true,
      payments: true,
      documents: true,
      orderItems: { include: { product: true } },
    },
  },
} satisfies Prisma.TableSessionInclude;
type Session = Prisma.TableSessionGetPayload<{ include: typeof include }>;

export type TablePaymentResult = {
  state: "paid" | "register";
  orderId: string;
  documentId?: string;
  total: number;
  method: string;
};
export type TablePaymentData = {
  sessionId: string;
  tableId: string;
  tableLabel: string;
  revision: number;
  orderVersion: string;
  total: number;
  draftCount: number;
  status: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    total: number;
    status: string;
  }[];
  receipt: TableReceiptInput;
  cashShift: { id: string; name: string } | null;
  documents: ("ticket" | "receipt" | "invoice")[];
  result: TablePaymentResult | null;
};

function paidResult(session: Session): TablePaymentResult | null {
  const order = session.order;
  if (
    session.status !== "CLOSED" ||
    order?.status !== "COMPLETED" ||
    !order.documents.length ||
    !order.payments.length
  )
    return null;
  return {
    state: "paid",
    orderId: order.id,
    documentId: order.documents[0].id,
    total: Number(order.total),
    method:
      order.payments.length > 1
        ? "combine"
        : order.payments[0].method.toLowerCase(),
  };
}

async function sharedCashShift(
  db: Prisma.TransactionClient,
  companyId: string,
) {
  return db.cashShift.findFirst({
    where: {
      companyId,
      status: "OPEN",
      user: { role: { in: ["ADMIN", "CASHIER"] }, active: true },
    },
    orderBy: [{ openedAt: "desc" }, { id: "asc" }],
    select: { id: true, user: { select: { name: true } } },
  });
}

export async function getTablePaymentData(
  companyId: string,
  tableId: string,
  sessionId?: string,
): Promise<response<TablePaymentData>> {
  const db = prisma();
  const [session, shift, company] = await Promise.all([
    db.tableSession.findFirst({
      where: {
        companyId,
        tableId,
        ...(sessionId ? { id: sessionId } : { current: true }),
      },
      include,
    }),
    sharedCashShift(db, companyId),
    db.company.findUnique({
      where: { id: companyId },
      select: { billingCredentials: true },
    }),
  ]);
  if (!session?.order)
    return {
      success: false,
      message: "Esta mesa no tiene una cuenta disponible.",
    };
  const order = session.order;
  const config =
    company?.billingCredentials as unknown as BillingCredentials | null;
  const customer = order.customer;
  return {
    success: true,
    data: {
      sessionId: session.id,
      tableId,
      tableLabel: session.table.label || String(session.table.number),
      revision: session.draftRevision,
      orderVersion: order.updatedAt.toISOString(),
      total: Number(order.total),
      status: session.status,
      draftCount: Array.isArray(session.draft) ? session.draft.length : 0,
      items: order.orderItems.map((item) => ({
        id: item.id,
        name: item.product.name,
        quantity: Number(item.quantity),
        total: Number(item.total),
        status: item.kitchenStatus,
      })),
      receipt: {
        documentType:
          order.documentType === "invoice" || order.documentType === "receipt"
            ? order.documentType
            : "ticket",
        customer: customer?.documentType
          ? {
              documentType: customer.documentType,
              documentNumber: customer.documentNumber ?? "",
              legalName: customer.legalName ?? "",
              address: customer.address ?? "",
            }
          : undefined,
      },
      documents: [
        "ticket",
        ...(config?.receiptSerialNumber ? ["receipt" as const] : []),
        ...(config?.invoiceSerialNumber ? ["invoice" as const] : []),
      ],
      cashShift: shift
        ? { id: shift.id, name: shift.user.name || "Caja del restaurante" }
        : null,
      result: paidResult(session),
    },
  };
}

function reject(message: string): never {
  throw new Error(message);
}

export async function payTable(
  user: AuthorizedUser,
  input: TablePaymentInput,
): Promise<response<TablePaymentResult>> {
  try {
    return await prisma().$transaction(
      async (tx) => {
        // Lock this session and its order; retries always recover the original receipt.
        await tx.$queryRaw`SELECT id FROM "TableSession" WHERE id = ${input.sessionId} AND "companyId" = ${user.companyId} FOR UPDATE`;
        const session = await tx.tableSession.findFirst({
          where: { id: input.sessionId, companyId: user.companyId },
          include,
        });
        if (!session?.order)
          return reject("No se encontró la cuenta de esta mesa.");
        const recovered = paidResult(session);
        if (recovered) return { success: true, data: recovered };
        const order = session.order;
        await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
        if (
          !session.current ||
          !["OPEN", "BILL_REQUESTED"].includes(session.status) ||
          order.status !== "PENDING" ||
          order.payments.length ||
          order.documents.length
        )
          return reject("Esta cuenta ya no admite pagos. Revisa su estado.");
        if (Array.isArray(session.draft) && session.draft.length)
          return reject(
            "Hay productos sin enviar. Vuelve al pedido para resolverlos.",
          );
        if (
          session.draftRevision !== input.revision ||
          order.updatedAt.toISOString() !== input.orderVersion ||
          !order.total.equals(input.expectedTotal)
        )
          return reject(
            "La cuenta cambió en otro dispositivo. Revisa el total actualizado antes de confirmar.",
          );
        const items = order.orderItems.filter(
          (item) => item.kitchenStatus !== "CANCELLED",
        );
        if (!items.length || order.total.lte(0))
          return reject("La cuenta no tiene productos para cobrar.");
        const company = await tx.company.findUnique({
          where: { id: user.companyId },
        });
        if (!company?.active)
          return reject("El restaurante no está habilitado para cobrar.");
        const config = {
          ticketSerialNumber: "NV01",
          ...(company.billingCredentials as unknown as Partial<BillingCredentials>),
        };
        const receipt = input.receipt;
        if (
          (receipt.documentType === "invoice" && !config.invoiceSerialNumber) ||
          (receipt.documentType === "receipt" && !config.receiptSerialNumber)
        )
          return reject(
            "El comprobante elegido no está configurado para este restaurante.",
          );
        const canCollectCash = user.role === "ADMIN" || user.role === "CASHIER";
        if (
          !canCollectCash &&
          !["credit_card", "debit_card", "wallet", "register"].includes(
            input.method,
          )
        )
          return reject(
            "El efectivo y los pagos combinados se cobran en caja.",
          );
        if (
          session.status === "BILL_REQUESTED" &&
          !canCollectCash &&
          input.method !== "register"
        )
          return reject("Esta cuenta está pendiente de cobro en caja.");

        if (input.method === "register" && session.status === "BILL_REQUESTED")
          return {
            success: true,
            data: {
              state: "register",
              orderId: order.id,
              total: Number(order.total),
              method: "register",
            },
          };
        let customerId: string | null = null;
        if (receipt.documentType !== "ticket" && receipt.customer) {
          // Keep the receipt's customer details independent of past receipts.
          const customer = await tx.customer.create({
            data: { ...receipt.customer, companyId: user.companyId },
          });
          customerId = customer.id;
        }
        if (input.method === "register") {
          await tx.order.update({
            where: { id: order.id },
            data: { customerId, documentType: receipt.documentType },
          });
          await tx.tableSession.update({
            where: { id: session.id },
            data: { status: "BILL_REQUESTED" },
          });
          return {
            success: true,
            data: {
              state: "register",
              orderId: order.id,
              total: Number(order.total),
              method: "register",
            },
          };
        }
        const shift = await sharedCashShift(tx, user.companyId);
        if (!shift)
          return reject(
            "No hay una caja compartida abierta. Solicita su apertura en caja.",
          );
        if (shift.id !== input.cashShiftId)
          return reject(
            "La caja receptora cambió. Revisa la cuenta antes de confirmar.",
          );
        await tx.$queryRaw`SELECT id FROM "CashShift" WHERE id = ${shift.id} AND status = 'OPEN' FOR UPDATE`;
        const amounts =
          input.method === "combine"
            ? input.contributions
            : { [input.method]: Number(order.total) };
        if (!amounts) return reject("Ingresa los importes del pago combinado.");
        const payments: Payment[] = [];
        for (const [method, amount] of Object.entries(amounts)) {
          if (!amount) continue;
          const base = { amount, cashShiftId: shift.id };
          if (method === "cash") {
            if (
              !canCollectCash ||
              input.cashReceived === undefined ||
              input.cashReceived < amount
            )
              return reject(
                "El efectivo recibido debe cubrir el aporte en efectivo.",
              );
            payments.push({
              ...base,
              method: "cash",
              received_amount: input.cashReceived,
              change: new Prisma.Decimal(input.cashReceived)
                .minus(amount)
                .toNumber(),
            });
          } else if (method === "wallet") {
            const details = canCollectCash
              ? walletPaymentDetailsSchema.safeParse(input.wallet)
              : null;
            if (details && !details.success)
              return reject(details.error.issues[0].message);
            payments.push({
              ...base,
              method: "wallet",
              ...(details?.success ? details.data : {}),
            });
          } else if (method === "debit_card" || method === "credit_card")
            payments.push({ ...base, method });
        }
        const validation = validatePayments(Number(order.total), payments);
        if (!validation.success) return reject(validation.message);
        if (input.method === "combine" && payments.length < 2)
          return reject("El pago combinado requiere al menos dos medios.");
        const domainOrder: Order = {
          id: order.id,
          companyId: user.companyId,
          customerId: customerId ?? undefined,
          cashShiftId: shift.id,
          sellerId: user.id,
          documentType: receipt.documentType,
          status: "completed",
          createdAt: order.createdAt,
          total: Number(order.total),
          netTotal: Number(order.netTotal),
          discountAmount: Number(order.discountAmount),
          payments,
          orderItems: items.map(mapReceiptPrintOrderItem),
        };
        const transfers = await generateOrderStocksTransfers(
          user.id,
          domainOrder,
          (id) => findProduct(id, user.companyId, tx),
        );
        if (!transfers.success)
          return reject("No se pudo verificar el stock de los productos.");
        for (const transfer of transfers.data) {
          const updated = await tx.product.updateMany({
            where: {
              id: transfer.productId,
              companyId: user.companyId,
              stock: { gte: -transfer.value },
            },
            data: { stock: { increment: transfer.value } },
          });
          if (updated.count !== 1)
            return reject(
              `Stock insuficiente: ${transfer.productName}. Solicita una revisión en caja.`,
            );
          await tx.stockTransfer.create({
            data: {
              userId: user.id,
              companyId: user.companyId,
              productId: transfer.productId,
              value: transfer.value,
              type: "ORDER",
              status: "EXECUTED",
              data: { orderItemId: transfer.orderItemId },
            },
          });
        }
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "COMPLETED",
            cashShiftId: shift.id,
            sellerId: user.id,
            customerId,
            documentType: receipt.documentType,
          },
        });
        for (const payment of payments) {
          const data = {
            confirmedById: user.id,
            source: "table",
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
          };
          await tx.payment.create({
            data: {
              orderId: order.id,
              cashShiftId: shift.id,
              amount: payment.amount,
              method:
                payment.method.toUpperCase() as Prisma.PaymentCreateInput["method"],
              data,
            },
          });
        }
        const document = await buildAndPersistDocument(
          {
            createDocument: (doc) => createDocument(doc, tx),
            getLastDocumentNumber: (id, series) =>
              getLatestDocumentNumber(id, series, tx),
          },
          domainOrder,
          config,
        );
        if (!document.success)
          return reject(
            "No se pudo generar el comprobante. El pago no fue registrado.",
          );
        if (receipt.documentType !== "ticket")
          await tx.documentTaxDispatch.create({
            data: { documentId: document.data.id, companyId: user.companyId },
          });
        await tx.tableSession.update({
          where: { id: session.id },
          data: { status: "CLOSED", current: null, closedAt: new Date() },
        });
        return {
          success: true,
          data: {
            state: "paid",
            orderId: order.id,
            documentId: document.data.id,
            total: Number(order.total),
            method: input.method,
          },
        };
      },
      { isolationLevel: "Serializable", timeout: 15000 },
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    return {
      success: false,
      message:
        code === "P2034"
          ? "La cuenta o la caja cambió durante el cobro. Consulta su estado antes de volver a confirmar."
          : code
            ? "No se pudo registrar el pago. Consulta el estado de la cuenta antes de reintentar."
            : error instanceof Error
              ? error.message
              : "No se pudo registrar el pago. Consulta el estado de la cuenta.",
    };
  }
}
