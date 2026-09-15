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
} from "./db_repository";
import { closeTableSession } from "./use-cases/close-table-session";
import { requestBill } from "./use-cases/request-bill";
import type { RoundItem } from "./use-cases/add-round";
import { transferTable } from "./use-cases/transfer-table";
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
  SendTableDraftSchema,
} from "./schemas";
import { TableDraftSchema } from "./schemas";
import { openTableForService, updateTableDraft } from "./draft-repository";
import {
  submitOrderRound,
  findOrderRounds,
} from "@/order/rounds/db_repository";
import { getOrderRounds } from "@/order/rounds/use-cases/get-order-rounds";
import { CancelRoundItemSchema } from "@/order/rounds/schema";
import { cancelRoundItem } from "@/order/rounds/use-cases/cancel-round-item";
import { persistRoundItemCancellation } from "@/order/rounds/db_repository";

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
  async (user, sessionId: string, revision: number, roundId: string) => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = SendTableDraftSchema.safeParse({
      sessionId,
      revision,
      roundId,
    });
    if (!parsed.success)
      return { success: false, message: "El pedido no es válido." };
    const draft = await updateTableDraft({
      ...parsed.data,
      companyId: user.companyId,
      userId: user.id,
      operation: "read",
    });
    if (!draft.success) return draft;
    const result = await submitOrderRound({
      companyId: user.companyId,
      userId: user.id,
      sessionId,
      draftRevision: revision,
      roundId,
      items: draft.data.items ?? [],
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
  async (user, tableId: string, items: RoundItem[], roundId: string) => {
    const parsed = AddRoundSchema.safeParse({ tableId, items, roundId });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await submitOrderRound({
      companyId: user.companyId,
      userId: user.id,
      tableId: parsed.data.tableId,
      roundId: parsed.data.roundId,
      items: parsed.data.items,
    });

    if (result.success) {
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "table-round-added", {
        tableId: parsed.data.tableId,
        orderId: result.data.orderId,
        round: result.data.number,
      });
    }
    return result;
  },
);

export const getOrderRoundsAction = protectedAction(
  { resource: "tables", action: "read" },
  async (user, orderId: string) =>
    getOrderRounds(orderId, (id) => findOrderRounds(id, user.companyId)),
);

export const cancelRoundItemAction = protectedAction(
  { resource: "tables", action: "update" },
  async (user, input) => {
    const parsed = CancelRoundItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await cancelRoundItem(
      {
        ...parsed.data,
        companyId: user.companyId,
        userId: user.id,
        isAdmin: user.role === "ADMIN",
      },
      persistRoundItemCancellation,
    );

    if (result.success) {
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "order-item-cancelled", {
        orderRoundItemId: parsed.data.orderRoundItemId,
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
