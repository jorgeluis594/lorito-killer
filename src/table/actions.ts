"use server";

import { response } from "@/lib/types";
import { protectedAction } from "@/authorization/server";
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
  updateTable as dbUpdateTable,
  deleteTable as dbDeleteTable,
  getWaiters,
} from "./db_repository";
import { openTableSession } from "./use-cases/open-table-session";
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
} from "./schemas";

// -- Zone Actions --

export const getZones = protectedAction(
  { resource: "tables", action: "read" },
  async (user): Promise<response<Zone[]>> => {
    return findZones(user.companyId);
  },
);

export const createZoneAction = protectedAction(
  { resource: "tables", action: "create" },
  async (user, data: { name: string; order?: number }): Promise<response<Zone>> => {
    const parsed = CreateZoneSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, message: parsed.error.errors[0]?.message ?? "Datos invalidos" };
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
  async (user, id: string, data: { name?: string; order?: number }): Promise<response<Zone>> => {
    const parsed = UpdateZoneSchema.safeParse({ id, data });
    if (!parsed.success) {
      return { success: false, message: parsed.error.errors[0]?.message ?? "Datos invalidos" };
    }

    const result = await dbUpdateZone(parsed.data.id, user.companyId, parsed.data.data);
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
      return { success: false, message: parsed.error.errors[0]?.message ?? "Datos invalidos" };
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
      return { success: false, message: parsed.error.errors[0]?.message ?? "Datos invalidos" };
    }

    const result = await dbCreateTable(user.companyId, parsed.data);
    if (result.success) {
      revalidatePath("/dashboard/tables");
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
    data: { number?: number; label?: string; capacity?: number; zoneId?: string },
  ): Promise<response<Table>> => {
    const parsed = UpdateTableSchema.safeParse({ id, data });
    if (!parsed.success) {
      return { success: false, message: parsed.error.errors[0]?.message ?? "Datos invalidos" };
    }

    const result = await dbUpdateTable(parsed.data.id, user.companyId, parsed.data.data);
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
    const parsed = DeleteTableSchema.safeParse({ id });
    if (!parsed.success) {
      return { success: false, message: parsed.error.errors[0]?.message ?? "Datos invalidos" };
    }

    const result = await dbDeleteTable(parsed.data.id, user.companyId);
    if (result.success) {
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
    const parsed = OpenTableSchema.safeParse({ tableId, guestCount, notes });
    if (!parsed.success) {
      return { success: false, message: parsed.error.errors[0]?.message ?? "Datos invalidos" };
    }

    const result = await withinTransaction(async () => {
      return openTableSession(user.companyId, parsed.data.tableId, user.id, parsed.data.guestCount, parsed.data.notes);
    });

    if (result.success) {
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "table-session-changed", {
        tableId: parsed.data.tableId,
        sessionStatus: "OPEN",
      });
    }
    return result;
  },
);

export const closeTable = protectedAction(
  { resource: "tables", action: "update" },
  async (user, tableId: string, cancelled?: boolean): Promise<response<TableSession>> => {
    const parsed = CloseTableSchema.safeParse({ tableId, cancelled: cancelled ?? false });
    if (!parsed.success) {
      return { success: false, message: parsed.error.errors[0]?.message ?? "Datos invalidos" };
    }

    const result = await closeTableSession(user.companyId, parsed.data.tableId, parsed.data.cancelled);

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
      return { success: false, message: parsed.error.errors[0]?.message ?? "Datos invalidos" };
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
      return { success: false, message: parsed.error.errors[0]?.message ?? "Datos invalidos" };
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

export const transferTableAction = protectedAction(
  { resource: "tables", action: "update" },
  async (user, tableId: string, newWaiterId: string): Promise<response<TableSession>> => {
    const parsed = TransferTableSchema.safeParse({ tableId, newWaiterId });
    if (!parsed.success) {
      return { success: false, message: parsed.error.errors[0]?.message ?? "Datos invalidos" };
    }

    const result = await transferTable(user.companyId, parsed.data.tableId, parsed.data.newWaiterId);

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
