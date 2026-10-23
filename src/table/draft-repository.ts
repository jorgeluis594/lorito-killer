import prisma from "@/lib/prisma";
import { log } from "@/lib/log";
import type { response } from "@/lib/types";
import type { RoundItem } from "./types";
import { findActiveSession } from "./db_repository";
import type { TableSession } from "./types";

export async function openTableForService(input: {
  companyId: string;
  tableId: string;
  waiterId: string;
  guestCount?: number;
  notes?: string;
}): Promise<response<TableSession>> {
  try {
    const created = await prisma().$transaction(async (tx) => {
      const table = await tx.table.findFirst({
        where: { id: input.tableId, companyId: input.companyId, active: true },
      });
      if (!table) return false;
      await tx.tableSession.create({
        data: {
          ...input,
          order: {
            create: {
              companyId: input.companyId,
              orderType: "DINE_IN",
              status: "PENDING",
              discountAmount: 0,
              netTotal: 0,
              total: 0,
            },
          },
        },
      });
      return true;
    });
    if (!created)
      return { success: false, message: "La mesa no está disponible." };
    return findActiveSession(input.tableId, input.companyId);
  } catch (error) {
    return {
      success: false,
      message:
        (error as { code?: string }).code === "P2002"
          ? "Otro mozo acaba de tomar la mesa. Revisa su pedido."
          : "No se pudo abrir la mesa. Vuelve a intentarlo.",
    };
  }
}

const changed =
  "La mesa cambió en otro dispositivo. Tus cambios siguen aquí; revisa el pedido antes de continuar.";

const closed = "Esta mesa ya se cerró.";
const unavailable = "La mesa ya no está disponible.";

/** Revision checks serialize changes without overwriting another waiter's draft. */
export async function updateTableDraft(
  input: {
    companyId: string;
    userId: string;
    sessionId: string;
    revision: number;
    operation: "save" | "read" | "leave" | "release";
    items?: RoundItem[];
  },
  attempt = 0,
): Promise<
  response<{ revision: number; tableId: string | null; items?: RoundItem[] }>
> {
  try {
    return await prisma().$transaction(
      async (tx) => {
        const session = await tx.tableSession.findFirst({
          where: {
            id: input.sessionId,
            companyId: input.companyId,
            current: true,
            OR: [{ tableId: null }, { table: { active: true } }],
          },
          include: {
            order: {
              include: {
                // Cancelled round items stay as quantity 0 rows; the UI hides them, so the guards below must too.
                orderItems: { where: { quantity: { gt: 0 } } },
                payments: true,
                documents: true,
              },
            },
          },
        });
        if (!session) {
          // Only picks the type; no new lock. A closed session is told apart from a missing one.
          const reread = await tx.tableSession.findFirst({
            where: { id: input.sessionId, companyId: input.companyId },
            select: { current: true },
          });
          return reread && !reread.current
            ? { success: false, type: "SessionClosed", message: closed }
            : {
                success: false,
                type: "SessionUnavailable",
                message: unavailable,
              };
        }
        if (session.draftRevision !== input.revision) {
          return { success: false, type: "SessionChanged", message: changed };
        }
        const order = session.order;
        const closing =
          input.operation === "leave" || input.operation === "release";
        if (
          session.status !== "OPEN" ||
          !order ||
          order.status !== "PENDING" ||
          order.payments.length ||
          order.documents.length
        ) {
          return {
            success: false,
            type: "OrderLocked",
            message: "Esta mesa ya no admite cambios en el pedido.",
          };
        }
        const stored = session.draft as unknown as RoundItem[];
        const items = input.operation === "save" ? input.items ?? [] : stored;
        if (input.operation === "read") {
          return {
            success: true,
            data: {
              revision: session.draftRevision,
              tableId: session.tableId,
              items: stored,
            },
          };
        }
        // Leaving an established or non-empty session never releases the table; a delivery or take-away is only cancelled by an explicit release.
        if (
          input.operation === "leave" &&
          (session.tableId === null ||
            stored.length ||
            order.orderItems.length ||
            session.waiterId !== input.userId)
        ) {
          return {
            success: true,
            data: { revision: session.draftRevision, tableId: session.tableId },
          };
        }
        // An explicit release frees any empty table, whoever opened it.
        if (
          input.operation === "release" &&
          (stored.length || order.orderItems.length)
        ) {
          return {
            success: false,
            type: "SessionHasProducts",
            message: "La mesa tiene productos y no se puede liberar.",
          };
        }
        const products = await tx.product.findMany({
          where: {
            id: { in: items.map((item) => item.productId) },
            companyId: input.companyId,
            hidden: false,
          },
          select: {
            id: true,
            name: true,
            price: true,
          },
        });
        const productMap = new Map(
          products.map((product) => [product.id, product]),
        );
        if (items.some((item) => !productMap.has(item.productId))) {
          return {
            success: false,
            message:
              "Un producto ya no está disponible. Retíralo del pedido para continuar.",
          };
        }
        const draft = items.map((item) => ({
          productId: item.productId,
          productName: productMap.get(item.productId)!.name,
          productPrice: Number(productMap.get(item.productId)!.price),
          quantity: item.quantity,
          notes: item.notes ?? "",
        }));
        const updated = await tx.tableSession.updateMany({
          where: {
            id: session.id,
            companyId: input.companyId,
            current: true,
            status: "OPEN",
            draftRevision: input.revision,
          },
          data: {
            draftRevision: { increment: 1 },
            draft: input.operation === "save" ? draft : [],
            ...(closing
              ? {
                  current: null,
                  status: "CANCELLED",
                  closedAt: new Date(),
                  cancellationReason: "Apertura sin pedido",
                }
              : {}),
          },
        });
        if (updated.count !== 1)
          return { success: false, type: "SessionChanged", message: changed };
        if (closing) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: "CANCELLED" },
          });
        }
        return {
          success: true,
          data: { revision: input.revision + 1, tableId: session.tableId },
        };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2034") {
      // Otro flujo escribió la sesión (p. ej. un renombre): la nueva
      // transacción relee y decide con el estado real.
      if (attempt < 2) {
        log.debug("table_draft_serialization_retried", {
          companyId: input.companyId,
          sessionId: input.sessionId,
          operation: input.operation,
          attempt: attempt + 1,
        });
        return updateTableDraft(input, attempt + 1);
      }
      return { success: false, type: "SessionChanged", message: changed };
    }
    console.error("updateTableDraft failed", error);
    return {
      success: false,
      message:
        "No se pudo guardar el pedido. Vuelve a intentarlo; tus productos siguen aquí.",
    };
  }
}
