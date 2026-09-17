import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { response } from "@/lib/types";
import { createKitchenTickets } from "@/kitchen/use-cases/create-kitchen-tickets";
import { createKitchenTicketContent } from "@/printing/create-kitchen-ticket-content";
import {
  DishProductType,
  PackageProductType,
  ServiceProductType,
  SingleProductType,
} from "@/product/types";
import { find as findProduct } from "@/product/db_repository";
import { generateOrderStocksTransfers } from "@/stock-transfer/use-cases/generate-order-stock-transfer";
import { sendRound, type PersistedRoundLine } from "./use-cases/send-round";
import type { FulfillmentRoundInput } from "./fulfillment-schema";
import type { SendRoundResult } from "./types";

type Db = Prisma.TransactionClient;

const productTypes = {
  DISH: DishProductType,
  PACKAGE_PRODUCT: PackageProductType,
  SERVICE_PRODUCT: ServiceProductType,
  SINGLE_PRODUCT: SingleProductType,
} as const;

const hashRequest = (input: FulfillmentRoundInput) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        orderId: input.orderId,
        orderType: input.orderType,
        items: input.items,
      }),
    )
    .digest("hex");

async function findExisting(db: Db, companyId: string, roundId: string) {
  const round = await db.orderRound.findFirst({
    where: { id: roundId, order: { companyId } },
    include: {
      order: true,
      kitchenTickets: {
        include: { printJobs: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!round) return null;
  return {
    orderId: round.orderId,
    requestHash: round.requestHash,
    result: {
      orderId: round.orderId,
      roundId: round.id,
      number: round.number,
      tableId: "",
      printJobIds: round.kitchenTickets.flatMap((ticket) =>
        ticket.printJobs.map((job) => job.id),
      ),
    },
  };
}

async function persistStock(
  db: Db,
  companyId: string,
  userId: string,
  orderId: string,
  lines: Array<PersistedRoundLine & { orderItemId: string }>,
) {
  const transfers = await generateOrderStocksTransfers(
    userId,
    {
      id: orderId,
      companyId,
      orderItems: lines.map((line) => ({
        id: line.orderItemId,
        productId: line.productId,
        productName: line.productName,
        productPrice: line.productPrice,
        unitType: "unit",
        quantity: line.quantity,
        netTotal: line.productPrice * line.quantity,
        discountAmount: 0,
        total: line.productPrice * line.quantity,
      })),
      netTotal: 0,
      discountAmount: 0,
      total: 0,
      status: "pending",
      paymentStatus: "pending",
      payments: [],
      documentType: "ticket",
      createdAt: new Date(),
    },
    (id) => findProduct(id, companyId, db),
  );
  if (!transfers.success) throw new Error("No se pudo verificar el stock.");

  const quantities = new Map<string, Prisma.Decimal>();
  for (const transfer of transfers.data)
    quantities.set(
      transfer.productId,
      (quantities.get(transfer.productId) ?? new Prisma.Decimal(0)).add(
        transfer.value,
      ),
    );
  for (const [productId, value] of quantities) {
    const updated = await db.product.updateMany({
      where: { id: productId, companyId, stock: { gte: value.negated() } },
      data: { stock: { increment: value } },
    });
    if (updated.count !== 1)
      throw new Error("Stock insuficiente para confirmar el pedido.");
  }
  await db.stockTransfer.createMany({
    data: transfers.data.map((transfer) => ({
      id: transfer.id,
      userId,
      companyId,
      productId: transfer.productId,
      value: transfer.value,
      type: "ORDER",
      status: "EXECUTED",
      data: { orderItemId: transfer.orderItemId },
    })),
  });
}

export async function submitFulfillmentRound(
  companyId: string,
  userId: string,
  input: FulfillmentRoundInput,
  attempt = 0,
): Promise<response<SendRoundResult>> {
  const requestHash = hashRequest(input);
  try {
    return await prisma().$transaction(
      async (db) => {
        const recovered = await findExisting(db, companyId, input.roundId);
        if (recovered)
          return recovered.requestHash === requestHash
            ? { success: true, data: recovered.result }
            : {
                success: false,
                message: "El identificador de envío ya fue utilizado.",
              };

        let order = input.orderId
          ? await db.order.findFirst({
              where: { id: input.orderId, companyId },
            })
          : null;
        if (input.orderId && !order)
          return { success: false, message: "El pedido no está disponible." };
        if (order) {
          await db.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
          order = await db.order.findFirst({
            where: { id: order.id, companyId },
          });
          if (
            !order ||
            order.orderType !== input.orderType ||
            order.status !== "PENDING" ||
            order.paymentStatus !== "PENDING"
          )
            return {
              success: false,
              message: "El pedido ya no admite adicionales.",
            };
        } else {
          order = await db.order.create({
            data: {
              companyId,
              sellerId: userId,
              orderType: input.orderType,
              status: "PENDING",
              paymentStatus: "PENDING",
              discountAmount: 0,
              netTotal: 0,
              total: 0,
              documentType: "ticket",
              ...(input.orderType === "DELIVERY"
                ? { delivery: { create: { createdById: userId } } }
                : {}),
            },
          });
        }

        const result = await sendRound(
          {
            companyId,
            orderId: order.id,
            roundId: input.roundId,
            requestHash,
            items: input.items,
          },
          {
            findExisting: (roundId) => findExisting(db, companyId, roundId),
            findProducts: async (ids) =>
              (
                await db.product.findMany({
                  where: { id: { in: ids }, companyId, hidden: false },
                  include: { kitchen: true },
                })
              )
                .filter(
                  (product) =>
                    !product.kitchen || product.kitchen.status === "ACTIVE",
                )
                .map((product) => ({
                  id: product.id,
                  name: product.name,
                  price: product.price.toNumber(),
                  type: productTypes[product.productType],
                  kitchenId: product.kitchenId,
                })),
            persist: async (lines) => {
              const highest = await db.orderRound.aggregate({
                where: { orderId: order.id },
                _max: { number: true },
              });
              const number = (highest._max.number ?? 0) + 1;
              const round = await db.orderRound.create({
                data: {
                  id: input.roundId,
                  orderId: order.id,
                  number,
                  responsibleUserId: userId,
                  requestHash,
                },
              });
              const persistedLines = [];
              for (const line of lines) {
                const amount = new Prisma.Decimal(line.productPrice).mul(
                  line.quantity,
                );
                const item = await db.orderItem.create({
                  data: {
                    orderId: order.id,
                    productId: line.productId,
                    productPrice: line.productPrice,
                    quantity: line.quantity,
                    notes: line.notes,
                    round: number,
                    discountAmount: 0,
                    netTotal: amount,
                    total: amount,
                  },
                });
                await db.orderRoundItem.create({
                  data: {
                    orderRoundId: round.id,
                    orderItemId: item.id,
                    productId: line.productId,
                    productName: line.productName,
                    quantity: line.quantity,
                    notes: line.notes,
                    kitchenId: line.kitchenId,
                  },
                });
                persistedLines.push({ ...line, orderItemId: item.id });
              }
              await persistStock(
                db,
                companyId,
                userId,
                order.id,
                persistedLines,
              );
              const totals = await db.orderItem.aggregate({
                where: { orderId: order.id },
                _sum: { total: true, netTotal: true },
              });
              await db.order.update({
                where: { id: order.id },
                data: {
                  total: totals._sum.total ?? 0,
                  netTotal: totals._sum.netTotal ?? 0,
                },
              });

              const kitchenIds = [
                ...new Set(
                  lines.flatMap((line) =>
                    line.kitchenId ? [line.kitchenId] : [],
                  ),
                ),
              ];
              const kitchens = await db.kitchen.findMany({
                where: { id: { in: kitchenIds }, companyId, status: "ACTIVE" },
                include: { printer: true },
              });
              if (kitchens.length !== kitchenIds.length)
                throw new Error("Una Kitchen ya no está disponible.");
              const responsible = await db.user.findFirst({
                where: { id: userId, companyId, active: true },
                select: { name: true, email: true },
              });
              if (!responsible)
                throw new Error("El responsable ya no está activo.");
              const printJobIds = await createKitchenTickets(
                kitchens,
                async (kitchen) => {
                  const ticket = await db.kitchenTicket.create({
                    data: { orderRoundId: round.id, kitchenId: kitchen.id },
                  });
                  if (!kitchen.printer || kitchen.printer.status !== "ACTIVE")
                    return null;
                  const content = createKitchenTicketContent(
                    {
                      ticketId: ticket.id,
                      createdAt: round.createdAt,
                      kitchenName: kitchen.name,
                      orderType: input.orderType,
                      orderLabel: order.id.slice(0, 8).toUpperCase(),
                      responsibleName: responsible.name || responsible.email,
                      items: lines
                        .filter((line) => line.kitchenId === kitchen.id)
                        .map((line) => ({
                          productName: line.productName,
                          quantity: line.quantity,
                          notes: line.notes,
                        })),
                    },
                    kitchen.printer,
                  );
                  const job = await db.kitchetTicketPrintJob.create({
                    data: {
                      companyId,
                      kitchenTicketId: ticket.id,
                      printerId: kitchen.printer.id,
                      requestedById: userId,
                      content: Buffer.from(content),
                    },
                  });
                  return job.id;
                },
              );
              return {
                orderId: order.id,
                roundId: round.id,
                number,
                tableId: "",
                printJobIds,
              };
            },
          },
        );
        if (!result.success) throw new Error(result.message);
        return result;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      },
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if ((code === "P2034" || code === "P2002") && attempt < 2)
      return submitFulfillmentRound(companyId, userId, input, attempt + 1);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo confirmar el pedido.",
    };
  }
}
