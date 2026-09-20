import prisma from "@/lib/prisma";
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

/** Revision checks serialize changes without overwriting another waiter's draft. */
export async function updateTableDraft(input: {
  companyId: string;
  userId: string;
  sessionId: string;
  revision: number;
  operation: "save" | "read" | "leave";
  items?: RoundItem[];
}): Promise<
  response<{ revision: number; tableId: string; items?: RoundItem[] }>
> {
  try {
    return await prisma().$transaction(
      async (tx) => {
        const session = await tx.tableSession.findFirst({
          where: {
            id: input.sessionId,
            companyId: input.companyId,
            current: true,
            table: { active: true },
          },
          include: {
            order: {
              include: { orderItems: true, payments: true, documents: true },
            },
          },
        });
        if (!session || session.draftRevision !== input.revision) {
          return { success: false, message: changed };
        }
        const order = session.order;
        if (
          session.status !== "OPEN" ||
          !order ||
          order.status !== "PENDING" ||
          order.payments.length ||
          order.documents.length
        ) {
          return {
            success: false,
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
        // Leaving an established or non-empty session never releases the table.
        if (
          input.operation === "leave" &&
          (stored.length ||
            order.orderItems.length ||
            session.waiterId !== input.userId)
        ) {
          return {
            success: true,
            data: { revision: session.draftRevision, tableId: session.tableId },
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
            ...(input.operation === "leave"
              ? {
                  current: null,
                  status: "CANCELLED",
                  closedAt: new Date(),
                  cancellationReason: "Apertura sin pedido",
                }
              : {}),
          },
        });
        if (updated.count !== 1) return { success: false, message: changed };
        if (input.operation === "leave") {
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
    if ((error as { code?: string }).code === "P2034")
      return { success: false, message: changed };
    console.error("updateTableDraft failed", error);
    return {
      success: false,
      message:
        "No se pudo guardar el pedido. Vuelve a intentarlo; tus productos siguen aquí.",
    };
  }
}
