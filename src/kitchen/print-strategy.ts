import prisma from "@/lib/prisma";
import {
  createKitchenTicketContent,
  type KitchenTicketContentInput,
} from "@/printing/create-kitchen-ticket-content";
import type { PrintJobStrategy } from "@/printing/jobs/types";

export const kitchenTicketPrintStrategy: PrintJobStrategy<KitchenTicketContentInput> =
  {
    async buildSnapshot(db, companyId, sourceId, options) {
      const isReprint = options?.isReprint ?? false;
      const ticket = await db.kitchenTicket.findUnique({
        where: { id: sourceId, orderRound: { order: { companyId } } },
        include: {
          kitchen: { select: { name: true } },
          orderRound: {
            include: {
              responsibleUser: { select: { name: true, email: true } },
              order: {
                select: {
                  id: true,
                  orderType: true,
                  delivery: { select: { name: true } },
                  tableSession: {
                    select: {
                      table: { select: { label: true, number: true } },
                    },
                  },
                },
              },
              items: {
                include: {
                  orderItem: { select: { quantity: true } },
                  cancellations: { select: { quantity: true } },
                },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      });
      if (!ticket) throw new Error("Comanda no encontrada.");
      const { order, responsibleUser } = ticket.orderRound;
      return {
        ticketId: ticket.id,
        createdAt: ticket.createdAt,
        kitchenName: ticket.kitchen.name,
        orderType: order.orderType,
        orderLabel:
          order.tableSession?.table?.label ||
          String(
            order.tableSession?.table?.number ??
              order.id.slice(0, 8).toUpperCase(),
          ),
        responsibleName: responsibleUser.name || responsibleUser.email,
        customerName: order.delivery?.name,
        isReprint,
        items: ticket.orderRound.items
          .filter(
            (item) =>
              item.kitchenId === ticket.kitchenId &&
              (isReprint || item.orderItem.quantity.gt(0)),
          )
          .map((item) => ({
            productName: item.productName,
            quantity: item.orderItem.quantity.toNumber(),
            cancelledQuantity: isReprint
              ? item.cancellations.reduce(
                  (sum, cancellation) => sum + cancellation.quantity.toNumber(),
                  0,
                )
              : undefined,
            notes: item.notes,
          })),
      };
    },
    // El snapshot vuelve de JSON con la fecha como texto.
    render: (ticket, printer) =>
      createKitchenTicketContent(
        { ...ticket, createdAt: new Date(ticket.createdAt) },
        printer,
      ),
    async failureAudience(job) {
      const ticket = await prisma().kitchenTicket.findUniqueOrThrow({
        where: { id: job.sourceId },
        select: { orderRound: { select: { responsibleUserId: true } } },
      });
      return {
        channels: [
          "kitchen-admin",
          `kitchen-user-${ticket.orderRound.responsibleUserId}`,
        ],
      };
    },
  };
