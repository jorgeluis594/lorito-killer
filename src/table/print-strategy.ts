import prisma from "@/lib/prisma";
import { shortLocalizeDate } from "@/lib/utils";
import type { PrintJobStrategy } from "@/printing/jobs/types";
import { printCommandsToEscpos } from "@/printing/print-commands-to-escpos";
import {
  addItems,
  currency,
  pushAmountLine,
  pushWrappedLabel,
  pushWrappedText,
  separator,
  text,
} from "@/printing/thermal-receipt-renderer";
import type { PrintCommand } from "@/printing/types";

export type PreBillSnapshot = {
  tableLabel: string;
  waiterName: string;
  guestCount: number | null;
  printedAt: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    netTotal: number;
    discountAmount: number;
  }[];
  subtotal: number;
  discountAmount: number;
  total: number;
};

export const buildPreBillCommands = (
  preBill: PreBillSnapshot,
  columns: number,
): PrintCommand[] => {
  const commands: PrintCommand[] = [
    text("PRECUENTA", { align: "center", bold: true }),
    separator(columns, "="),
  ];
  pushWrappedLabel(commands, columns, "Mesa", preBill.tableLabel);
  pushWrappedLabel(commands, columns, "Mozo", preBill.waiterName);
  pushWrappedLabel(
    commands,
    columns,
    "Personas",
    preBill.guestCount?.toString(),
  );
  pushWrappedLabel(
    commands,
    columns,
    "Hora",
    shortLocalizeDate(new Date(preBill.printedAt)),
  );
  addItems(commands, columns, { order: { items: preBill.items } });
  commands.push(separator(columns));
  if (preBill.discountAmount > 0) {
    pushAmountLine(commands, columns, "Subtotal:", currency(preBill.subtotal));
    pushAmountLine(
      commands,
      columns,
      "Descuento:",
      currency(preBill.discountAmount),
    );
  }
  pushAmountLine(commands, columns, "Total:", currency(preBill.total), true);
  commands.push(separator(columns));
  pushWrappedText(commands, columns, "No valido como comprobante de pago", {
    align: "center",
    bold: true,
  });
  commands.push({ type: "cut" });
  return commands;
};

export const preBillPrintStrategy: PrintJobStrategy<PreBillSnapshot> = {
  maxAttempts: 3,
  async buildSnapshot(db, companyId, sourceId) {
    const session = await db.tableSession.findFirst({
      where: { id: sourceId, companyId },
      select: {
        guestCount: true,
        table: { select: { label: true, number: true } },
        waiter: { select: { name: true, email: true } },
        order: {
          select: {
            netTotal: true,
            discountAmount: true,
            total: true,
            orderItems: {
              where: { quantity: { gt: 0 } },
              orderBy: { createdAt: "asc" },
              select: {
                quantity: true,
                productPrice: true,
                netTotal: true,
                discountAmount: true,
                product: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!session?.table || !session.order)
      throw new Error("No se encontró la cuenta de la mesa.");
    const { table, waiter, order } = session;
    return {
      tableLabel: table.label || String(table.number),
      waiterName: waiter.name || waiter.email,
      guestCount: session.guestCount,
      printedAt: new Date().toISOString(),
      items: order.orderItems.map((item) => ({
        name: item.product.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.productPrice),
        netTotal: Number(item.netTotal),
        discountAmount: Number(item.discountAmount),
      })),
      subtotal: Number(order.netTotal),
      discountAmount: Number(order.discountAmount),
      total: Number(order.total),
    };
  },
  render: async (preBill, printer) =>
    printCommandsToEscpos(
      buildPreBillCommands(preBill, printer.columns),
      printer,
    ),
  // Avisa a quien la pidió y al mozo de la mesa.
  failureAudience: async (job) => {
    const { waiterId } = await prisma().tableSession.findUniqueOrThrow({
      where: { id: job.sourceId },
      select: { waiterId: true },
    });
    return {
      channels: [
        ...new Set([
          `print-user-${job.requestedById}`,
          `print-user-${waiterId}`,
        ]),
      ],
    };
  },
};
