import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { response } from "@/lib/types";
import type { Kitchen, KitchenOption } from "./types";
import type { PrintJob, PrintJobStatus } from "./types";
import type { KitchenTicketView, ManualPrintJob } from "./types";
import type { KitchenPrinterActivity } from "./use-cases/check-kitchen-printers";
import type { ManualPrintInput } from "./use-cases/print-kitchen-ticket";
import type {
  KitchenTicketContentInput,
  KitchenTicketPrinterProfile,
} from "@/printing/create-kitchen-ticket-content";
import type { KitchenInput } from "./use-cases/configure-kitchens";

const configurationError = (error: unknown) => {
  const code = (error as { code?: string }).code;
  if (code === "P2002" || code === "P2034") {
    return "La impresora ya está asignada a otra Kitchen";
  }
  return error instanceof Error ? error.message : "Error interno del servidor";
};

const toPrintJob = (job: {
  id: string;
  companyId: string;
  kitchenTicketId: string;
  printerId: string;
  content: Uint8Array;
  status: PrintJobStatus;
  attempts: number;
  nextAttemptAt: Date | null;
  claimRequestedAt: Date | null;
  processingStartedAt: Date | null;
  printer: { printClientId: string; localName: string };
}): PrintJob => ({
  id: job.id,
  companyId: job.companyId,
  kitchenTicketId: job.kitchenTicketId,
  printerId: job.printerId,
  printClientId: job.printer.printClientId,
  printerLocalName: job.printer.localName,
  content: job.content,
  status: job.status,
  attempts: job.attempts,
  nextAttemptAt: job.nextAttemptAt,
  claimRequestedAt: job.claimRequestedAt,
  processingStartedAt: job.processingStartedAt,
});

const printJobInclude = {
  printer: { select: { printClientId: true, localName: true } },
} satisfies Prisma.KitchetTicketPrintJobInclude;

export const findPrintJob = async (jobId: string): Promise<PrintJob | null> => {
  const job = await prisma().kitchetTicketPrintJob.findUnique({
    where: { id: jobId },
    include: printJobInclude,
  });
  return job ? toPrintJob(job) : null;
};

export const authorizePrintJob = async (input: {
  jobId: string;
  clientId: string;
  expectedClaimRequestedAt: Date;
  now: Date;
}): Promise<PrintJob | null> => {
  const changed = await prisma().kitchetTicketPrintJob.updateMany({
    where: {
      id: input.jobId,
      status: "PENDING",
      claimRequestedAt: input.expectedClaimRequestedAt,
      printer: {
        printClientId: input.clientId,
        printClient: { revokedAt: null },
      },
    },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 },
      nextAttemptAt: null,
      claimRequestedAt: null,
      processingStartedAt: input.now,
      lastError: null,
    },
  });
  return changed.count === 1 ? findPrintJob(input.jobId) : null;
};

export const recordPrintJobResult = async (input: {
  jobId: string;
  clientId: string;
  attemptNumber: number;
  status: "PENDING" | "DELIVERED" | "FAILED";
  nextAttemptAt: Date | null;
  error: string | null;
}): Promise<PrintJob | null> => {
  const changed = await prisma().kitchetTicketPrintJob.updateMany({
    where: {
      id: input.jobId,
      status: "PROCESSING",
      attempts: input.attemptNumber,
      printer: {
        printClientId: input.clientId,
        printClient: { revokedAt: null },
      },
    },
    data: {
      status: input.status,
      nextAttemptAt: input.nextAttemptAt,
      claimRequestedAt: null,
      processingStartedAt: null,
      lastError: input.error,
    },
  });
  return changed.count === 1 ? findPrintJob(input.jobId) : null;
};

export const failTimedOutPrintJob = async (input: {
  jobId: string;
  status: PrintJobStatus;
  observedAt: Date;
  error: string;
}): Promise<PrintJob | null> => {
  const dateField =
    input.status === "PENDING"
      ? { claimRequestedAt: input.observedAt }
      : { processingStartedAt: input.observedAt };
  const changed = await prisma().kitchetTicketPrintJob.updateMany({
    where: { id: input.jobId, status: input.status, ...dateField },
    data: {
      status: "FAILED",
      nextAttemptAt: null,
      claimRequestedAt: null,
      processingStartedAt: null,
      lastError: input.error,
    },
  });
  return changed.count === 1 ? findPrintJob(input.jobId) : null;
};

export const failRevokedPrintJobs = async (now: Date): Promise<string[]> => {
  const jobs = await prisma().$queryRaw<{ id: string }[]>(Prisma.sql`
    UPDATE "KitchetTicketPrintJob" job
    SET status = 'FAILED', "claimRequestedAt" = NULL,
        "processingStartedAt" = NULL, "nextAttemptAt" = NULL,
        "lastError" = 'El cliente de impresión fue revocado', "updatedAt" = ${now}
    FROM "Printer" printer
    JOIN "PrintClient" client ON client.id = printer."printClientId"
    WHERE job."printerId" = printer.id
      AND job.status = 'PENDING' AND client."revokedAt" IS NOT NULL
    RETURNING job.id
  `);
  return jobs.map((job) => job.id);
};

type ReservedJob = {
  id: string;
  companyId: string;
  printClientId: string;
};

export const reserveDuePrintJobs = (now: Date): Promise<ReservedJob[]> =>
  prisma().$queryRaw<ReservedJob[]>(Prisma.sql`
    WITH candidates AS (
      SELECT job.id
      FROM "KitchetTicketPrintJob" job
      WHERE job.status = 'PENDING'
        AND job."claimRequestedAt" IS NULL
        AND (job."nextAttemptAt" IS NULL OR job."nextAttemptAt" <= ${now})
        AND EXISTS (
          SELECT 1 FROM "Printer" printer
          JOIN "PrintClient" client ON client.id = printer."printClientId"
          WHERE printer.id = job."printerId" AND client."revokedAt" IS NULL
        )
        AND NOT EXISTS (
          SELECT 1 FROM "KitchetTicketPrintJob" active
          WHERE active."printerId" = job."printerId"
            AND (active.status = 'PROCESSING'
              OR (active.status = 'PENDING' AND active."claimRequestedAt" IS NOT NULL))
        )
        AND NOT EXISTS (
          SELECT 1 FROM "KitchetTicketPrintJob" older
          WHERE older."printerId" = job."printerId"
            AND older.status = 'PENDING'
            AND older."claimRequestedAt" IS NULL
            AND (older."nextAttemptAt" IS NULL OR older."nextAttemptAt" <= ${now})
            AND (older."createdAt", older.id) < (job."createdAt", job.id)
        )
      ORDER BY job."createdAt", job.id
      FOR UPDATE OF job SKIP LOCKED
    ), reserved AS (
      UPDATE "KitchetTicketPrintJob" job
      SET "claimRequestedAt" = ${now}, "updatedAt" = ${now}
      FROM candidates
      WHERE job.id = candidates.id AND job."claimRequestedAt" IS NULL
      RETURNING job.id, job."companyId", job."printerId"
    )
    SELECT reserved.id, reserved."companyId", printer."printClientId"
    FROM reserved
    JOIN "Printer" printer ON printer.id = reserved."printerId"
    JOIN "PrintClient" client ON client.id = printer."printClientId"
    WHERE client."revokedAt" IS NULL
  `);

export const findPrintJobTimeouts = (cutoff: Date) =>
  prisma().kitchetTicketPrintJob.findMany({
    where: {
      OR: [
        { status: "PENDING", claimRequestedAt: { lte: cutoff } },
        { status: "PROCESSING", processingStartedAt: { lte: cutoff } },
      ],
    },
    select: {
      id: true,
      status: true,
      claimRequestedAt: true,
      processingStartedAt: true,
    },
  });

export const findAnnouncedPrintJobs = (cutoff: Date) =>
  prisma().kitchetTicketPrintJob.findMany({
    where: {
      status: "PENDING",
      claimRequestedAt: { gt: cutoff },
      printer: { printClient: { revokedAt: null } },
    },
    select: {
      id: true,
      printer: { select: { printClientId: true } },
    },
  });

export const findPrintJobFailureAudience = (jobId: string) =>
  prisma().kitchetTicketPrintJob.findUnique({
    where: { id: jobId },
    select: {
      companyId: true,
      kitchenTicket: {
        select: { orderRound: { select: { responsibleUserId: true } } },
      },
    },
  });

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
              tableSession: {
                select: { table: { select: { label: true, number: true } } },
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
      printJobs: {
        select: { id: true, status: true, isReprint: true, createdAt: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const views: KitchenTicketView[] = tickets.map((ticket) => {
    const lastJob = ticket.printJobs[0] ?? null;
    const activeJob =
      ticket.printJobs.find(
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
        label:
          ticket.orderRound.order.tableSession?.table.label ||
          (ticket.orderRound.order.orderType === "DINE_IN"
            ? `Mesa ${ticket.orderRound.order.tableSession?.table.number ?? ""}`.trim()
            : ticket.orderRound.order.orderType === "DELIVERY"
              ? "Delivery"
              : "Para llevar"),
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
          kitchenTicketPrintJobs: {
            where: { status: "DELIVERED" },
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
            lastDeliveredAt:
              printer.kitchenTicketPrintJobs[0]?.updatedAt ?? null,
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
  generate: (
    content: KitchenTicketContentInput,
    profile: KitchenTicketPrinterProfile,
  ) => Uint8Array,
  attempt = 0,
): Promise<response<ManualPrintJob>> {
  try {
    return await prisma().$transaction(
      async (db) => {
        const existing = await db.kitchetTicketPrintJob.findUnique({
          where: { id: input.jobId },
          include: { printer: { select: { printClientId: true } } },
        });
        if (existing) {
          if (
            existing.companyId !== input.companyId ||
            existing.kitchenTicketId !== input.kitchenTicketId ||
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
              kitchenTicketId: existing.kitchenTicketId,
              printClientId: existing.printer.printClientId,
              status: existing.status,
              isReprint: existing.isReprint,
            },
          };
        }

        await db.$queryRaw`SELECT id FROM "KitchenTicket" WHERE id = ${input.kitchenTicketId} FOR UPDATE`;
        const recovered = await db.kitchetTicketPrintJob.findUnique({
          where: { id: input.jobId },
          include: { printer: { select: { printClientId: true } } },
        });
        if (recovered) {
          if (
            recovered.companyId !== input.companyId ||
            recovered.kitchenTicketId !== input.kitchenTicketId ||
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
              kitchenTicketId: recovered.kitchenTicketId,
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
            printJobs: { select: { id: true, status: true } },
            orderRound: {
              include: {
                responsibleUser: { select: { name: true, email: true } },
                order: {
                  select: {
                    orderType: true,
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
        if (input.isReprint) {
          if (!ticket.printJobs.length)
            return {
              success: false,
              message: "La comanda todavía no fue impresa.",
            };
          if (
            ticket.printJobs.some(
              (job) => job.status === "PENDING" || job.status === "PROCESSING",
            )
          )
            return {
              success: false,
              message: "La comanda ya tiene una impresión en curso.",
            };
        } else {
          if (ticket.printJobs.length)
            return { success: false, message: "La comanda ya fue impresa." };
          if (!items.some((item) => item.orderItem.quantity.gt(0)))
            return {
              success: false,
              message: "La comanda no tiene platos vigentes para imprimir.",
            };
        }

        const content = generate(
          {
            ticketId: ticket.id,
            createdAt: ticket.createdAt,
            kitchenName: ticket.kitchen.name,
            orderType: ticket.orderRound.order.orderType,
            orderLabel:
              ticket.orderRound.order.tableSession?.table.label ||
              String(
                ticket.orderRound.order.tableSession?.table.number ?? "Pedido",
              ),
            responsibleName:
              ticket.orderRound.responsibleUser.name ||
              ticket.orderRound.responsibleUser.email,
            isReprint: input.isReprint,
            items: items
              .filter(
                (item) => input.isReprint || item.orderItem.quantity.gt(0),
              )
              .map((item) => ({
                productName: item.productName,
                quantity: item.orderItem.quantity.toNumber(),
                cancelledQuantity: input.isReprint
                  ? item.cancellations.reduce(
                      (sum, cancellation) =>
                        sum + cancellation.quantity.toNumber(),
                      0,
                    )
                  : undefined,
                notes: item.notes,
              })),
          },
          printer,
        );
        const job = await db.kitchetTicketPrintJob.create({
          data: {
            id: input.jobId,
            companyId: input.companyId,
            kitchenTicketId: ticket.id,
            printerId: printer.id,
            requestedById: input.userId,
            isReprint: input.isReprint,
            content: Buffer.from(content),
          },
        });
        return {
          success: true,
          data: {
            id: job.id,
            kitchenTicketId: job.kitchenTicketId,
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
      return createManualKitchenTicketPrintJob(input, generate, attempt + 1);
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
