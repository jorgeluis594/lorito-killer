import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { UserRole } from "@/authorization/types";
import type { response } from "@/lib/types";
import type { KitchenItem } from "./types";
import type { Kitchen, KitchenOption } from "./types";
import type { PrintJob, PrintJobStatus } from "./types";
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

function stationFilter(role: UserRole): Prisma.OrderItemWhereInput {
  if (role === "ADMIN") return {};
  if (role === "KITCHEN") return { preparationStation: "KITCHEN" };
  if (role === "BARTENDER") return { preparationStation: "BAR" };
  return { id: { in: [] } };
}

function activeKitchenOrder(companyId: string): Prisma.OrderWhereInput {
  return {
    companyId,
    OR: [
      {
        status: "PENDING",
        tableSession: {
          current: true,
          status: { in: ["OPEN", "BILL_REQUESTED"] },
        },
      },
      { status: "COMPLETED", tableSession: { status: "CLOSED" } },
    ],
  };
}

export async function findKitchenItems(
  companyId: string,
  role: UserRole,
): Promise<response<KitchenItem[]>> {
  try {
    const items = await prisma().orderItem.findMany({
      where: {
        ...stationFilter(role),
        order: activeKitchenOrder(companyId),
        NOT: {
          kitchenStatus: { in: ["SERVED", "CANCELLED"] },
          order: { status: "COMPLETED" },
        },
      },
      include: {
        product: { select: { name: true } },
        order: { include: { tableSession: { include: { table: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true,
      data: items.map((item) => ({
        id: item.id,
        paid: item.order.paymentStatus === "PAID",
        preparationStation: item.preparationStation,
        productName: item.product.name,
        quantity: Number(item.quantity),
        notes: item.notes,
        round: item.round,
        tableLabel:
          item.order.tableSession?.table.label ||
          String(item.order.tableSession?.table.number),
        status: item.kitchenStatus,
        cancellationReason: item.cancellationReason,
        kitchenReadyAt: item.kitchenReadyAt,
        createdAt: item.createdAt,
      })),
    };
  } catch (error) {
    console.error("findKitchenItems error:", error);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function takePendingOrderItem(input: {
  orderItemId: string;
  companyId: string;
  userId: string;
  role: UserRole;
}): Promise<response<void>> {
  try {
    const result = await prisma().orderItem.updateMany({
      where: {
        id: input.orderItemId,
        AND: stationFilter(input.role),
        kitchenStatus: "PENDING",
        order: activeKitchenOrder(input.companyId),
      },
      data: {
        kitchenStatus: "PREPARING",
        kitchenTakenAt: new Date(),
        kitchenTakenById: input.userId,
      },
    });

    return result.count === 1
      ? { success: true, data: undefined }
      : { success: false, message: "El producto ya no esta pendiente" };
  } catch (error) {
    console.error("takePendingOrderItem error:", error);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function markPreparingOrderItemReady(input: {
  orderItemId: string;
  companyId: string;
  userId: string;
  role: UserRole;
}): Promise<response<void>> {
  try {
    const result = await prisma().orderItem.updateMany({
      where: {
        id: input.orderItemId,
        AND: stationFilter(input.role),
        kitchenStatus: "PREPARING",
        order: activeKitchenOrder(input.companyId),
      },
      data: {
        kitchenStatus: "READY",
        kitchenReadyAt: new Date(),
        kitchenReadyById: input.userId,
      },
    });

    return result.count === 1
      ? { success: true, data: undefined }
      : {
          success: false,
          message: "Solo un producto en preparacion puede marcarse listo",
        };
  } catch (error) {
    console.error("markPreparingOrderItemReady error:", error);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function serveReadyRound(input: {
  tableId: string;
  round: number;
  companyId: string;
  userId: string;
}): Promise<response<void>> {
  try {
    return await prisma().$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          companyId: input.companyId,
          status: "PENDING",
          tableSession: {
            tableId: input.tableId,
            current: true,
            status: { in: ["OPEN", "BILL_REQUESTED"] },
          },
        },
        select: {
          id: true,
          orderItems: {
            where: {
              round: input.round,
              kitchenStatus: { not: "CANCELLED" },
            },
            select: { kitchenStatus: true },
          },
        },
      });

      if (
        !order ||
        order.orderItems.length === 0 ||
        !order.orderItems.every((item) => item.kitchenStatus === "READY")
      ) {
        return {
          success: false,
          message: "Solo una comanda lista puede marcarse servida",
        };
      }

      const served = await tx.orderItem.updateMany({
        where: {
          orderId: order.id,
          round: input.round,
          kitchenStatus: "READY",
        },
        data: {
          kitchenStatus: "SERVED",
          servedAt: new Date(),
          servedById: input.userId,
        },
      });

      return served.count === order.orderItems.length
        ? { success: true, data: undefined }
        : { success: false, message: "La comanda ya fue servida" };
    });
  } catch (error) {
    console.error("serveReadyRound error:", error);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function servePaidKitchenItem(input: {
  orderItemId: string;
  companyId: string;
  userId: string;
  role: UserRole;
}): Promise<response<void>> {
  const result = await prisma().orderItem.updateMany({
    where: {
      id: input.orderItemId,
      AND: stationFilter(input.role),
      kitchenStatus: "READY",
      order: {
        companyId: input.companyId,
        paymentStatus: "PAID",
      },
    },
    data: {
      kitchenStatus: "SERVED",
      servedAt: new Date(),
      servedById: input.userId,
    },
  });
  return result.count === 1
    ? { success: true, data: undefined }
    : {
        success: false,
        message: "El producto ya no está listo para entregar.",
      };
}
