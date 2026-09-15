import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { response } from "@/lib/types";
import {
  DishProductType,
  PackageProductType,
  ServiceProductType,
  SingleProductType,
} from "@/product/types";
import { createKitchenTicketContent } from "@/printing/create-kitchen-ticket-content";
import { createKitchenTickets } from "@/kitchen/use-cases/create-kitchen-tickets";
import { sendRound } from "./use-cases/send-round";
import type { OrderRoundView, RoundLineInput, SendRoundResult } from "./types";
import type { CancelRoundItemInput } from "./schema";
import type { OrderItemCancellationResult } from "./use-cases/cancel-round-item";

type Db = Prisma.TransactionClient;

export async function persistRoundItemCancellation(
  input: CancelRoundItemInput & {
    companyId: string;
    userId: string;
    isAdmin: boolean;
  },
): Promise<response<OrderItemCancellationResult>> {
  try {
    return await prisma().$transaction(
      async (db) => {
        const existing = await db.orderItemCancellation.findUnique({
          where: { id: input.cancellationId },
          include: {
            orderRoundItem: {
              include: { orderRound: { include: { order: true } } },
            },
          },
        });
        if (existing) {
          const same =
            existing.orderRoundItemId === input.orderRoundItemId &&
            existing.quantity.equals(input.quantity) &&
            (existing.reason ?? "") === (input.reason ?? "") &&
            existing.orderRoundItem.orderRound.order.companyId ===
              input.companyId;
          if (!same)
            return {
              success: false,
              message: "El identificador de cancelación ya fue utilizado.",
            };
          return {
            success: true,
            data: {
              id: existing.id,
              orderRoundItemId: existing.orderRoundItemId,
              quantity: existing.quantity.toNumber(),
              reason: existing.reason,
            },
          };
        }

        const item = await db.orderRoundItem.findFirst({
          where: {
            id: input.orderRoundItemId,
            orderRound: { order: { companyId: input.companyId } },
          },
          include: {
            orderItem: true,
            cancellations: true,
            orderRound: { include: { order: true } },
          },
        });
        if (!item)
          return { success: false, message: "El plato enviado no existe." };
        await db.$queryRaw`SELECT id FROM "Order" WHERE id = ${item.orderRound.orderId} FOR UPDATE`;
        const locked = await db.orderRoundItem.findUnique({
          where: { id: item.id },
          include: {
            orderItem: true,
            cancellations: true,
            orderRound: { include: { order: true } },
          },
        });
        if (!locked)
          return { success: false, message: "El plato enviado no existe." };
        if (
          !input.isAdmin &&
          locked.orderRound.responsibleUserId !== input.userId
        )
          return {
            success: false,
            message: "No puedes cancelar platos enviados por otro mozo.",
          };
        if (
          locked.orderRound.order.paymentStatus !== "PENDING" ||
          locked.orderRound.order.status !== "PENDING"
        )
          return {
            success: false,
            message: "Un pedido pagado o cerrado ya no admite cancelaciones.",
          };

        const quantity = new Prisma.Decimal(input.quantity);
        const cancelled = locked.cancellations.reduce(
          (sum, row) => sum.add(row.quantity),
          new Prisma.Decimal(0),
        );
        if (
          quantity.gt(locked.quantity.sub(cancelled)) ||
          quantity.gt(locked.orderItem.quantity)
        )
          return {
            success: false,
            message: "La cantidad supera los platos disponibles.",
          };

        const newQuantity = locked.orderItem.quantity.sub(quantity);
        const netTotal = locked.orderItem.productPrice.mul(newQuantity);
        let discountAmount = new Prisma.Decimal(0);
        if (
          locked.orderItem.discountType === "PERCENT" &&
          locked.orderItem.discountValue
        )
          discountAmount = netTotal
            .mul(locked.orderItem.discountValue)
            .div(100);
        else if (
          locked.orderItem.discountType === "AMOUNT" &&
          locked.orderItem.discountValue
        )
          discountAmount = Prisma.Decimal.min(
            netTotal,
            locked.orderItem.discountValue,
          );
        await db.orderItem.update({
          where: { id: locked.orderItemId },
          data: {
            quantity: newQuantity,
            netTotal,
            discountAmount,
            total: netTotal.sub(discountAmount),
          },
        });
        const cancellation = await db.orderItemCancellation.create({
          data: {
            id: input.cancellationId,
            orderRoundItemId: locked.id,
            quantity,
            reason: input.reason || null,
            userId: input.userId,
          },
        });
        const totals = await db.orderItem.aggregate({
          where: { orderId: locked.orderRound.orderId },
          _sum: { total: true, netTotal: true, discountAmount: true },
        });
        await db.order.update({
          where: { id: locked.orderRound.orderId },
          data: {
            total: totals._sum.total ?? 0,
            netTotal: totals._sum.netTotal ?? 0,
            discountAmount: totals._sum.discountAmount ?? 0,
          },
        });
        return {
          success: true,
          data: {
            id: cancellation.id,
            orderRoundItemId: cancellation.orderRoundItemId,
            quantity: cancellation.quantity.toNumber(),
            reason: cancellation.reason,
          },
        };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    return {
      success: false,
      message:
        (error as { code?: string }).code === "P2034"
          ? "El pedido cambió. Revisa las cantidades e inténtalo otra vez."
          : "No se pudo cancelar el plato.",
    };
  }
}

const productTypes = {
  DISH: DishProductType,
  PACKAGE_PRODUCT: PackageProductType,
  SERVICE_PRODUCT: ServiceProductType,
  SINGLE_PRODUCT: SingleProductType,
} as const;

const requestHash = (items: RoundLineInput[]) =>
  createHash("sha256").update(JSON.stringify(items)).digest("hex");

const existingRound = async (db: Db, roundId: string) => {
  const round = await db.orderRound.findUnique({
    where: { id: roundId },
    include: {
      order: { select: { tableSession: { select: { tableId: true } } } },
      kitchenTickets: {
        include: {
          printJobs: { select: { id: true }, orderBy: { createdAt: "asc" } },
        },
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
      tableId: round.order.tableSession?.tableId ?? "",
      printJobIds: round.kitchenTickets.flatMap((ticket) =>
        ticket.printJobs.map((job) => job.id),
      ),
    },
  };
};

export async function submitOrderRound(
  input: {
    companyId: string;
    userId: string;
    roundId: string;
    items: RoundLineInput[];
    tableId?: string;
    sessionId?: string;
    draftRevision?: number;
  },
  attempt = 0,
): Promise<response<SendRoundResult>> {
  try {
    return await prisma().$transaction(
      async (db) => {
        const session = await db.tableSession.findFirst({
          where: {
            companyId: input.companyId,
            current: true,
            ...(input.sessionId
              ? { id: input.sessionId }
              : { tableId: input.tableId }),
          },
          include: {
            table: { select: { number: true, label: true, active: true } },
            order: { include: { payments: true, documents: true } },
          },
        });
        if (!session?.order || !session.table.active)
          return { success: false, message: "La mesa ya no está disponible." };

        await db.$queryRaw`SELECT id FROM "Order" WHERE id = ${session.order.id} FOR UPDATE`;
        const order = session.order;
        const hash = requestHash(input.items);

        return sendRound(
          {
            companyId: input.companyId,
            orderId: order.id,
            roundId: input.roundId,
            requestHash: hash,
            items: input.items,
          },
          {
            findExisting: (roundId) => existingRound(db, roundId),
            findProducts: async (productIds) => {
              const products = await db.product.findMany({
                where: {
                  id: { in: productIds },
                  companyId: input.companyId,
                  hidden: false,
                },
                include: {
                  kitchen: {
                    include: { printer: true },
                  },
                },
              });
              return products
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
                }));
            },
            persist: async (lines) => {
              if (
                session.status !== "OPEN" ||
                order.status !== "PENDING" ||
                order.payments.length ||
                order.documents.length
              )
                throw new Error("Esta mesa ya no admite cambios en el pedido.");
              if (
                input.sessionId &&
                (input.draftRevision === undefined ||
                  session.draftRevision !== input.draftRevision)
              )
                throw new Error(
                  "La mesa cambió en otro dispositivo. Revisa el pedido antes de continuar.",
                );

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
                  responsibleUserId: input.userId,
                  requestHash: hash,
                  tableSessionId: input.sessionId ?? null,
                  draftRevision: input.draftRevision ?? null,
                },
              });

              for (const line of lines) {
                const amount = new Prisma.Decimal(line.productPrice).mul(
                  line.quantity,
                );
                const orderItem = await db.orderItem.create({
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
                    orderItemId: orderItem.id,
                    productId: line.productId,
                    productName: line.productName,
                    quantity: line.quantity,
                    notes: line.notes,
                    kitchenId: line.kitchenId,
                  },
                });
              }

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
                where: {
                  id: { in: kitchenIds },
                  companyId: input.companyId,
                  status: "ACTIVE",
                },
                include: { printer: true },
              });
              if (kitchens.length !== kitchenIds.length)
                throw new Error(
                  "Una Kitchen ya no está activa o pertenece a otra empresa.",
                );

              const responsible = await db.user.findFirst({
                where: {
                  id: input.userId,
                  companyId: input.companyId,
                  active: true,
                },
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
                      orderType: order.orderType,
                      orderLabel:
                        session.table.label || String(session.table.number),
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
                      companyId: input.companyId,
                      kitchenTicketId: ticket.id,
                      printerId: kitchen.printer.id,
                      requestedById: input.userId,
                      content: Buffer.from(content),
                    },
                  });
                  return job.id;
                },
              );

              if (input.sessionId) {
                const cleared = await db.tableSession.updateMany({
                  where: {
                    id: input.sessionId,
                    companyId: input.companyId,
                    current: true,
                    draftRevision: input.draftRevision,
                  },
                  data: { draft: [], draftRevision: { increment: 1 } },
                });
                if (cleared.count !== 1)
                  throw new Error("La mesa cambió en otro dispositivo.");
              }

              return {
                orderId: order.id,
                roundId: round.id,
                number,
                tableId: session.tableId,
                printJobIds,
              };
            },
          },
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    const transient =
      code === "P2034" ||
      (code === "P2010" &&
        (error as { meta?: { code?: string } }).meta?.code === "40001");
    if (transient && attempt < 2) return submitOrderRound(input, attempt + 1);
    if (code === "P2002" || transient)
      return {
        success: false,
        message:
          "Otro envío cambió el pedido. Actualiza la mesa y vuelve a intentarlo.",
      };
    console.error("submitOrderRound failed", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "No se pudo enviar la ronda.",
    };
  }
}

export async function findOrderRounds(
  orderId: string,
  companyId: string,
): Promise<OrderRoundView[]> {
  const rounds = await prisma().orderRound.findMany({
    where: { orderId, order: { companyId } },
    include: {
      responsibleUser: { select: { id: true, name: true } },
      items: {
        include: {
          kitchen: { select: { id: true, name: true } },
          cancellations: { select: { quantity: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { number: "asc" },
  });
  return rounds.map((round) => ({
    id: round.id,
    number: round.number,
    responsible: round.responsibleUser,
    createdAt: round.createdAt,
    items: round.items.map((item) => {
      const cancelledQuantity = item.cancellations.reduce(
        (sum, cancellation) => sum + cancellation.quantity.toNumber(),
        0,
      );
      return {
        id: item.id,
        productName: item.productName,
        quantity: item.quantity.toNumber(),
        cancelledQuantity,
        currentQuantity: item.quantity.toNumber() - cancelledQuantity,
        notes: item.notes,
        kitchen: item.kitchen,
      };
    }),
  }));
}
