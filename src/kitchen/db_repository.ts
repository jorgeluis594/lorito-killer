import {
  describeServiceOrder,
  toServiceOrderIdentity,
} from "@/delivery/use-cases/describe-service-order";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { response } from "@/lib/types";
import type { Kitchen, KitchenOption } from "./types";
import type { KitchenTicketView, ManualPrintJob } from "./types";
import type { KitchenPrinterActivity } from "./use-cases/check-kitchen-printers";
import type { ManualPrintInput } from "./use-cases/print-kitchen-ticket";
import { createPrintJob } from "@/printing/jobs/db_repository";
import type { KitchenInput } from "./use-cases/configure-kitchens";

const configurationError = (error: unknown) => {
  const code = (error as { code?: string }).code;
  if (code === "P2002" || code === "P2034") {
    return "La impresora ya está asignada a otra Kitchen";
  }
  return error instanceof Error ? error.message : "Error interno del servidor";
};

function ticketOrderLabel(order: {
  orderType: string;
  delivery: { name: string | null; phone: string } | null;
  tableSession: {
    openedAt: Date;
    customerName: string | null;
    table: { label: string | null; number: number } | null;
  } | null;
}) {
  const table = order.tableSession?.table;
  if (table?.label) return table.label;
  if (order.orderType === "DINE_IN")
    return `Mesa ${table?.number ?? ""}`.trim();
  const identity = toServiceOrderIdentity({
    orderType: order.orderType,
    sessionCustomerName: order.tableSession?.customerName,
    delivery: order.delivery,
    openedAt: order.tableSession?.openedAt ?? new Date(0),
  });
  return identity ? describeServiceOrder(identity).printLabel : "Para llevar";
}

export async function findKitchenTickets(input: {
  companyId: string;
  orderId?: string;
  requiresActionOnly?: boolean;
  responsibleUserId?: string;
}): Promise<KitchenTicketView[]> {
  const tickets = await prisma().kitchenTicket.findMany({
    where: {
      orderRound: {
        ...(input.orderId ? { orderId: input.orderId } : {}),
        order: {
          companyId: input.companyId,
          ...(input.requiresActionOnly ? { status: "PENDING" } : {}),
        },
        ...(input.responsibleUserId
          ? { responsibleUserId: input.responsibleUserId }
          : {}),
      },
    },
    include: {
      kitchen: { include: { printer: true } },
      orderRound: {
        select: {
          number: true,
          responsibleUserId: true,
          order: {
            select: {
              id: true,
              orderType: true,
              delivery: { select: { name: true, phone: true } },
              tableSession: {
                select: {
                  openedAt: true,
                  customerName: true,
                  table: { select: { label: true, number: true } },
                },
              },
            },
          },
          items: {
            select: {
              kitchenId: true,
              orderItem: { select: { quantity: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const jobs = await prisma().printJob.findMany({
    where: {
      sourceType: "KITCHEN_TICKET",
      sourceId: { in: tickets.map((ticket) => ticket.id) },
    },
    select: {
      id: true,
      sourceId: true,
      status: true,
      isReprint: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const views: KitchenTicketView[] = tickets.map((ticket) => {
    const printJobs = jobs
      .filter((job) => job.sourceId === ticket.id)
      .map(({ sourceId: _sourceId, ...job }) => job);
    const lastJob = printJobs[0] ?? null;
    const activeJob =
      printJobs.find(
        (job) => job.status === "PENDING" || job.status === "PROCESSING",
      ) ?? null;
    const hasCurrentItems = ticket.orderRound.items.some(
      (item) =>
        item.kitchenId === ticket.kitchen.id && item.orderItem.quantity.gt(0),
    );
    const validPrinter =
      ticket.kitchen.status === "ACTIVE" &&
      ticket.kitchen.printer?.status === "ACTIVE" &&
      ticket.kitchen.printer.companyId === input.companyId;
    return {
      id: ticket.id,
      order: {
        id: ticket.orderRound.order.id,
        type: ticket.orderRound.order
          .orderType as KitchenTicketView["order"]["type"],
        label: ticketOrderLabel(ticket.orderRound.order),
      },
      kitchen: { id: ticket.kitchen.id, name: ticket.kitchen.name },
      round: {
        number: ticket.orderRound.number,
        responsibleUserId: ticket.orderRound.responsibleUserId,
      },
      createdAt: ticket.createdAt,
      attentionReason: !lastJob
        ? hasCurrentItems
          ? validPrinter
            ? "NOT_PRINTED"
            : "NO_PRINTER_CONFIGURED"
          : null
        : lastJob.status === "FAILED"
          ? "FAILED"
          : null,
      lastJob,
      activeJob:
        activeJob?.status === "PENDING" || activeJob?.status === "PROCESSING"
          ? { id: activeJob.id, status: activeJob.status }
          : null,
      canPrint: !lastJob && hasCurrentItems && Boolean(validPrinter),
      canReprint: Boolean(lastJob && !activeJob && validPrinter),
    };
  });
  return input.requiresActionOnly
    ? views.filter(({ attentionReason }) => attentionReason !== null)
    : views;
}

export const findKitchenPrinterActivity = async (
  companyId: string,
): Promise<KitchenPrinterActivity[]> => {
  const kitchens = await prisma().kitchen.findMany({
    where: { companyId, printerId: { not: null } },
    select: {
      name: true,
      printer: {
        select: {
          id: true,
          printClientId: true,
          lastDetectedAt: true,
          printClient: { select: { lastInventoryAt: true } },
          printJobs: {
            where: { sourceType: "KITCHEN_TICKET", status: "DELIVERED" },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            take: 1,
            select: { updatedAt: true },
          },
        },
      },
    },
  });
  return kitchens.flatMap(({ name, printer }) =>
    printer
      ? [
          {
            id: printer.id,
            name,
            printClientId: printer.printClientId,
            lastDetectedAt: printer.lastDetectedAt,
            lastInventoryAt: printer.printClient.lastInventoryAt,
            lastDeliveredAt: printer.printJobs[0]?.updatedAt ?? null,
          },
        ]
      : [],
  );
};

const manualPrintError = (error: unknown) => {
  const code = (error as { code?: string }).code;
  if (code === "P2002")
    return "La comanda ya tiene una impresión en curso. Actualiza el pedido.";
  if (code === "P2034" || code === "P2010")
    return "La comanda cambió. Actualiza el pedido e inténtalo otra vez.";
  return error instanceof Error
    ? error.message
    : "No se pudo solicitar la impresión.";
};

export async function createManualKitchenTicketPrintJob(
  input: ManualPrintInput & { isReprint: boolean },
  attempt = 0,
): Promise<response<ManualPrintJob>> {
  try {
    return await prisma().$transaction(
      async (db) => {
        const existing = await db.printJob.findUnique({
          where: { id: input.jobId },
          include: { printer: { select: { printClientId: true } } },
        });
        if (existing) {
          if (
            existing.companyId !== input.companyId ||
            existing.sourceType !== "KITCHEN_TICKET" ||
            existing.sourceId !== input.kitchenTicketId ||
            existing.requestedById !== input.userId ||
            existing.isReprint !== input.isReprint
          )
            return {
              success: false,
              message: "El identificador de impresión ya fue utilizado.",
            };
          return {
            success: true,
            data: {
              id: existing.id,
              kitchenTicketId: existing.sourceId,
              printClientId: existing.printer.printClientId,
              status: existing.status,
              isReprint: existing.isReprint,
            },
          };
        }

        await db.$queryRaw`SELECT id FROM "KitchenTicket" WHERE id = ${input.kitchenTicketId} FOR UPDATE`;
        const recovered = await db.printJob.findUnique({
          where: { id: input.jobId },
          include: { printer: { select: { printClientId: true } } },
        });
        if (recovered) {
          if (
            recovered.companyId !== input.companyId ||
            recovered.sourceType !== "KITCHEN_TICKET" ||
            recovered.sourceId !== input.kitchenTicketId ||
            recovered.requestedById !== input.userId ||
            recovered.isReprint !== input.isReprint
          )
            return {
              success: false,
              message: "El identificador de impresión ya fue utilizado.",
            };
          return {
            success: true,
            data: {
              id: recovered.id,
              kitchenTicketId: recovered.sourceId,
              printClientId: recovered.printer.printClientId,
              status: recovered.status,
              isReprint: recovered.isReprint,
            },
          };
        }
        const ticketIdentity = await db.kitchenTicket.findFirst({
          where: {
            id: input.kitchenTicketId,
            orderRound: { order: { companyId: input.companyId } },
          },
          select: {
            orderRound: { select: { orderId: true, responsibleUserId: true } },
          },
        });
        if (!ticketIdentity)
          return { success: false, message: "Comanda no encontrada." };
        if (
          input.role !== "ADMIN" &&
          ticketIdentity.orderRound.responsibleUserId !== input.userId
        )
          return {
            success: false,
            message: "No puedes imprimir una comanda de otro mozo.",
          };
        await db.$queryRaw`SELECT id FROM "Order" WHERE id = ${ticketIdentity.orderRound.orderId} FOR UPDATE`;

        const ticket = await db.kitchenTicket.findUnique({
          where: { id: input.kitchenTicketId },
          include: {
            kitchen: { include: { printer: true } },
            orderRound: {
              select: {
                items: {
                  select: {
                    kitchenId: true,
                    orderItem: { select: { quantity: true } },
                  },
                },
              },
            },
          },
        });
        if (!ticket)
          return { success: false, message: "Comanda no encontrada." };
        const items = ticket.orderRound.items.filter(
          (item) => item.kitchenId === ticket.kitchenId,
        );
        const printer = ticket.kitchen.printer;
        if (
          ticket.kitchen.status !== "ACTIVE" ||
          !printer ||
          printer.status !== "ACTIVE" ||
          printer.companyId !== input.companyId
        )
          return {
            success: false,
            message: "La Kitchen no tiene una impresora activa válida.",
          };
        const printJobs = await db.printJob.findMany({
          where: { sourceType: "KITCHEN_TICKET", sourceId: ticket.id },
          select: { id: true, status: true },
        });
        if (input.isReprint) {
          if (!printJobs.length)
            return {
              success: false,
              message: "La comanda todavía no fue impresa.",
            };
          if (
            printJobs.some(
              (job) => job.status === "PENDING" || job.status === "PROCESSING",
            )
          )
            return {
              success: false,
              message: "La comanda ya tiene una impresión en curso.",
            };
        } else {
          if (printJobs.length)
            return { success: false, message: "La comanda ya fue impresa." };
          if (!items.some((item) => item.orderItem.quantity.gt(0)))
            return {
              success: false,
              message: "La comanda no tiene platos vigentes para imprimir.",
            };
        }

        const job = await createPrintJob(db, {
          id: input.jobId,
          companyId: input.companyId,
          sourceType: "KITCHEN_TICKET",
          sourceId: ticket.id,
          printerId: printer.id,
          requestedById: input.userId,
          isReprint: input.isReprint,
        });
        return {
          success: true,
          data: {
            id: job.id,
            kitchenTicketId: job.sourceId,
            printClientId: printer.printClientId,
            status: job.status,
            isReprint: job.isReprint,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if ((code === "P2034" || code === "P2010") && attempt < 2)
      return createManualKitchenTicketPrintJob(input, attempt + 1);
    return { success: false, message: manualPrintError(error) };
  }
}

export const listKitchens = async (
  companyId: string,
  activeOnly: boolean,
): Promise<Kitchen[] | KitchenOption[]> =>
  activeOnly
    ? prisma().kitchen.findMany({
        where: { companyId, status: "ACTIVE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : prisma().kitchen.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          status: true,
          printerId: true,
          printer: { select: { id: true, localName: true, status: true } },
        },
        orderBy: { name: "asc" },
      });

const assertAssignablePrinter = async (
  db: Prisma.TransactionClient,
  companyId: string,
  printerId?: string | null,
) => {
  if (!printerId) return;
  await db.$queryRaw`SELECT id FROM "Printer" WHERE id = ${printerId} FOR UPDATE`;
  const printer = await db.printer.findFirst({
    where: { id: printerId, companyId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!printer)
    throw new Error("La impresora no está activa o pertenece a otra empresa");
};

export const createKitchenConfiguration = async (
  companyId: string,
  input: KitchenInput,
) => {
  try {
    const kitchen = await prisma().$transaction(
      async (db) => {
        await assertAssignablePrinter(db, companyId, input.printerId);
        return db.kitchen.create({
          data: { companyId, ...input, printerId: input.printerId || null },
          select: {
            id: true,
            name: true,
            status: true,
            printerId: true,
            printer: { select: { id: true, localName: true, status: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return { success: true as const, data: kitchen };
  } catch (error) {
    return { success: false as const, message: configurationError(error) };
  }
};

export const updateKitchenConfiguration = async (
  companyId: string,
  kitchenId: string,
  input: KitchenInput,
) => {
  try {
    const kitchen = await prisma().$transaction(
      async (db) => {
        await db.$queryRaw`SELECT id FROM "Kitchen" WHERE id = ${kitchenId} FOR UPDATE`;
        const current = await db.kitchen.findFirst({
          where: { id: kitchenId, companyId },
          select: { id: true },
        });
        if (!current) throw new Error("Kitchen no encontrada");
        await assertAssignablePrinter(db, companyId, input.printerId);
        if (input.status === "INACTIVE") {
          const activeProducts = await db.product.count({
            where: { kitchenId, companyId, hidden: false },
          });
          if (activeProducts > 0)
            throw new Error(
              "Oculta o reasigna los productos activos antes de desactivar la Kitchen",
            );
        }
        return db.kitchen.update({
          where: { id: kitchenId },
          data: { ...input, printerId: input.printerId || null },
          select: {
            id: true,
            name: true,
            status: true,
            printerId: true,
            printer: { select: { id: true, localName: true, status: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return { success: true as const, data: kitchen };
  } catch (error) {
    return { success: false as const, message: configurationError(error) };
  }
};
