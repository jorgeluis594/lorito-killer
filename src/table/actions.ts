"use server";

import { response } from "@/lib/types";
import { protectedAction } from "@/authorization/server";
import { requireFeature } from "@/feature-flags/server";
import { revalidatePath } from "next/cache";
import { broadcast } from "@/lib/realtime/broadcast";
import type { Zone, Table, TableSession, TableWithSession } from "./types";
import {
  findZones,
  findZone,
  createZone as dbCreateZone,
  updateZone as dbUpdateZone,
  deleteZone as dbDeleteZone,
  findTables,
  findTable,
  createTable as dbCreateTable,
  createTables as dbCreateTables,
  updateTable as dbUpdateTable,
  deleteTable as dbDeleteTable,
  getWaiters,
  cancelPendingOrderItem,
} from "./db_repository";
import { closeTableSession } from "./use-cases/close-table-session";
import { requestBill } from "./use-cases/request-bill";
import { addRound, type RoundItem } from "./use-cases/add-round";
import { transferTable } from "./use-cases/transfer-table";
import { withinTransaction } from "@/lib/prisma";
import {
  AddRoundSchema,
  OpenTableSchema,
  CloseTableSchema,
  RequestBillSchema,
  TransferTableSchema,
  CreateZoneSchema,
  UpdateZoneSchema,
  DeleteZoneSchema,
  CreateTableSchema,
  UpdateTableSchema,
  DeleteTableSchema,
  CancelOrderItemSchema,
  ServeKitchenRoundSchema,
} from "./schemas";
import { cancelOrderItem } from "./use-cases/cancel-order-item";
import { serveReadyRound } from "@/kitchen/db_repository";
import { TableDraftSchema } from "./schemas";
import { openTableForService, updateTableDraft } from "./draft-repository";

// -- Zone Actions --

export const saveTableDraft = protectedAction(
  { resource: "tables", action: "update" },
  async (
    user,
    input: { sessionId: string; revision: number; items: RoundItem[] },
  ) => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = TableDraftSchema.required({ items: true }).safeParse(input);
    if (!parsed.success)
      return {
        success: false,
        message: "Revisa los productos, cantidades y notas del pedido.",
      };
    const result = await updateTableDraft({
      ...parsed.data,
      companyId: user.companyId,
      userId: user.id,
      operation: "save",
    });
    if (result.success) {
      revalidatePath("/[subdomain]/dashboard/tables", "layout");
      await broadcast(user.companyId, "tables", "table-draft-changed", {
        tableId: result.data.tableId,
      }).catch(() => console.warn("Table draft notification failed"));
    }
    return result;
  },
);

export const sendTableDraft = protectedAction(
  { resource: "tables", action: "update" },
  async (user, sessionId: string, revision: number) => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = TableDraftSchema.safeParse({ sessionId, revision });
    if (!parsed.success)
      return { success: false, message: "El pedido no es válido." };
    const result = await updateTableDraft({
      ...parsed.data,
      companyId: user.companyId,
      userId: user.id,
      operation: "send",
    });
    if (result.success) {
      revalidatePath("/[subdomain]/dashboard/tables", "layout");
      await broadcast(user.companyId, "tables", "table-draft-changed", {
        tableId: result.data.tableId,
      }).catch(() => console.warn("Table draft notification failed"));
      await broadcast(user.companyId, "tables", "table-round-added", {
        tableId: result.data.tableId,
      }).catch(() => console.warn("Table round notification failed"));
    }
    return result;
  },
);

export const leaveEmptyTable = protectedAction(
  { resource: "tables", action: "update" },
  async (user, sessionId: string, revision: number) => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = TableDraftSchema.safeParse({ sessionId, revision });
    if (!parsed.success)
      return { success: false, message: "La mesa no es válida." };
    const result = await updateTableDraft({
      ...parsed.data,
      companyId: user.companyId,
      userId: user.id,
      operation: "leave",
    });
    if (result.success) {
      revalidatePath("/[subdomain]/dashboard/tables", "layout");
      await broadcast(user.companyId, "tables", "table-session-changed", {
        tableId: result.data.tableId,
      }).catch(() => console.warn("Table session notification failed"));
    }
    return result;
  },
);

export const getZones = protectedAction(
  { resource: "tables", action: "read" },
  async (user): Promise<response<Zone[]>> => {
    return findZones(user.companyId);
  },
);

export const createZoneAction = protectedAction(
  { resource: "tables", action: "create" },
  async (
    user,
    data: { name: string; order?: number },
  ): Promise<response<Zone>> => {
    const parsed = CreateZoneSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await dbCreateZone(user.companyId, parsed.data);
    if (result.success) {
      revalidatePath("/dashboard/tables");
      revalidatePath("/dashboard/settings/tables");
    }
    return result;
  },
);

export const updateZoneAction = protectedAction(
  { resource: "tables", action: "update" },
  async (
    user,
    id: string,
    data: { name?: string; order?: number },
  ): Promise<response<Zone>> => {
    const parsed = UpdateZoneSchema.safeParse({ id, data });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await dbUpdateZone(
      parsed.data.id,
      user.companyId,
      parsed.data.data,
    );
    if (result.success) {
      revalidatePath("/dashboard/tables");
      revalidatePath("/dashboard/settings/tables");
    }
    return result;
  },
);

export const deleteZoneAction = protectedAction(
  { resource: "tables", action: "delete" },
  async (user, id: string): Promise<response<void>> => {
    const parsed = DeleteZoneSchema.safeParse({ id });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await dbDeleteZone(parsed.data.id, user.companyId);
    if (result.success) {
      revalidatePath("/dashboard/tables");
      revalidatePath("/dashboard/settings/tables");
    }
    return result;
  },
);

// -- Table Actions --

export const getTables = protectedAction(
  { resource: "tables", action: "read" },
  async (user, zoneId?: string): Promise<response<TableWithSession[]>> => {
    return findTables(user.companyId, zoneId);
  },
);

export const getTable = protectedAction(
  { resource: "tables", action: "read" },
  async (user, id: string): Promise<response<TableWithSession>> => {
    return findTable(id, user.companyId);
  },
);

export const createTableAction = protectedAction(
  { resource: "tables", action: "create" },
  async (
    user,
    data: { number: number; label?: string; capacity: number; zoneId: string },
  ): Promise<response<Table>> => {
    const parsed = CreateTableSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await dbCreateTable(user.companyId, parsed.data);
    if (result.success) {
      revalidatePath("/dashboard/tables");
      revalidatePath("/dashboard/settings/tables");
    }
    return result;
  },
);

export const createTablesAction = protectedAction(
  { resource: "tables", action: "create" },
  async (user, data: { quantity: number; startNumber: number }) => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const result = await dbCreateTables(user.companyId, data);
    if (result.success) {
      revalidatePath("/[subdomain]/dashboard/tables", "layout");
      revalidatePath("/dashboard/settings/tables");
    }
    return result;
  },
);

export const updateTableAction = protectedAction(
  { resource: "tables", action: "update" },
  async (
    user,
    id: string,
    data: {
      number?: number;
      label?: string;
      capacity?: number;
      zoneId?: string;
    },
  ): Promise<response<Table>> => {
    const parsed = UpdateTableSchema.safeParse({ id, data });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await dbUpdateTable(
      parsed.data.id,
      user.companyId,
      parsed.data.data,
    );
    if (result.success) {
      revalidatePath("/dashboard/tables");
      revalidatePath("/dashboard/settings/tables");
    }
    return result;
  },
);

export const deleteTableAction = protectedAction(
  { resource: "tables", action: "delete" },
  async (user, id: string): Promise<response<void>> => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = DeleteTableSchema.safeParse({ id });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await dbDeleteTable(parsed.data.id, user.companyId);
    if (result.success) {
      revalidatePath("/[subdomain]/dashboard/tables", "layout");
      revalidatePath("/dashboard/tables");
      revalidatePath("/dashboard/settings/tables");
    }
    return result;
  },
);

// -- Session Actions --

export const openTable = protectedAction(
  { resource: "tables", action: "update" },
  async (
    user,
    tableId: string,
    guestCount?: number,
    notes?: string,
  ): Promise<response<TableSession>> => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = OpenTableSchema.safeParse({ tableId, guestCount, notes });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await openTableForService({
      ...parsed.data,
      companyId: user.companyId,
      waiterId: user.id,
    });

    if (result.success) {
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "table-session-changed", {
        tableId: parsed.data.tableId,
        sessionStatus: "OPEN",
      }).catch(() => console.warn("Table session notification failed"));
    }
    return result;
  },
);

export const closeTable = protectedAction(
  { resource: "tables", action: "update" },
  async (
    user,
    tableId: string,
    cancelled?: boolean,
    cancellationReason?: string,
  ): Promise<response<TableSession>> => {
    const parsed = CloseTableSchema.safeParse({
      tableId,
      cancelled: cancelled ?? false,
      cancellationReason,
    });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await closeTableSession(
      user.companyId,
      parsed.data.tableId,
      parsed.data.cancelled,
      parsed.data.cancellationReason,
    );

    if (result.success) {
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "table-session-changed", {
        tableId: parsed.data.tableId,
        sessionStatus: parsed.data.cancelled ? "CANCELLED" : "CLOSED",
      });
    }
    return result;
  },
);

export const requestBillAction = protectedAction(
  { resource: "tables", action: "update" },
  async (user, tableId: string): Promise<response<TableSession>> => {
    const parsed = RequestBillSchema.safeParse({ tableId });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await requestBill(user.companyId, parsed.data.tableId);

    if (result.success) {
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "table-session-changed", {
        tableId: parsed.data.tableId,
        sessionStatus: "BILL_REQUESTED",
      });
    }
    return result;
  },
);

export const addRoundAction = protectedAction(
  { resource: "tables", action: "update" },
  async (
    user,
    tableId: string,
    items: RoundItem[],
  ): Promise<response<{ orderId: string; round: number }>> => {
    const parsed = AddRoundSchema.safeParse({ tableId, items });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await withinTransaction(async () => {
      return addRound(parsed.data.tableId, user.companyId, parsed.data.items);
    });

    if (result.success) {
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "table-round-added", {
        tableId: parsed.data.tableId,
        orderId: result.data.orderId,
        round: result.data.round,
      });
    }
    return result;
  },
);

export const cancelOrderItemAction = protectedAction(
  { resource: "tables", action: "update" },
  async (
    user,
    orderItemId: string,
    reason: string,
  ): Promise<response<void>> => {
    const parsed = CancelOrderItemSchema.safeParse({ orderItemId, reason });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await cancelOrderItem(
      {
        orderItemId: parsed.data.orderItemId,
        companyId: user.companyId,
        userId: user.id,
        reason: parsed.data.reason,
      },
      cancelPendingOrderItem,
    );

    if (result.success) {
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "order-item-cancelled", {
        orderItemId: parsed.data.orderItemId,
      });
    }
    return result;
  },
);

export const serveKitchenRoundAction = protectedAction(
  { resource: "tables", action: "update" },
  async (user, tableId: string, round: number): Promise<response<void>> => {
    const parsed = ServeKitchenRoundSchema.safeParse({ tableId, round });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await serveReadyRound({
      tableId: parsed.data.tableId,
      round: parsed.data.round,
      companyId: user.companyId,
      userId: user.id,
    });
    if (result.success) {
      revalidatePath("/dashboard/tables");
      revalidatePath("/dashboard/kitchen");
      await broadcast(user.companyId, "tables", "kitchen-ticket-served", {
        tableId: parsed.data.tableId,
        round: parsed.data.round,
      });
    }
    return result;
  },
);

export const transferTableAction = protectedAction(
  { resource: "tables", action: "update" },
  async (
    user,
    tableId: string,
    newWaiterId: string,
  ): Promise<response<TableSession>> => {
    const parsed = TransferTableSchema.safeParse({ tableId, newWaiterId });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await transferTable(
      user.companyId,
      parsed.data.tableId,
      parsed.data.newWaiterId,
    );

    if (result.success) {
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "table-waiter-changed", {
        tableId: parsed.data.tableId,
        newWaiterId: parsed.data.newWaiterId,
      });
    }
    return result;
  },
);
