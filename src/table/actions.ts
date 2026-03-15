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
    const result = await dbCreateZone(user.companyId, data);
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
    const result = await dbUpdateZone(id, user.companyId, data);
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
    const result = await dbDeleteZone(id, user.companyId);
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
    const result = await dbCreateTable(user.companyId, data);
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
    const result = await dbUpdateTable(id, user.companyId, data);
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
    const result = await dbDeleteTable(id, user.companyId);
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
    const result = await withinTransaction(async () => {
      return openTableSession(user.companyId, tableId, user.id, guestCount, notes);
    });

    if (result.success) {
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "table-session-changed", {
        tableId,
        sessionStatus: "OPEN",
      });
    }
    return result;
  },
);

export const closeTable = protectedAction(
  { resource: "tables", action: "update" },
  async (user, tableId: string, cancelled?: boolean): Promise<response<TableSession>> => {
    const result = await closeTableSession(user.companyId, tableId, cancelled);

    if (result.success) {
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "table-session-changed", {
        tableId,
        sessionStatus: cancelled ? "CANCELLED" : "CLOSED",
      });
    }
    return result;
  },
);

export const requestBillAction = protectedAction(
  { resource: "tables", action: "update" },
  async (user, tableId: string): Promise<response<TableSession>> => {
    const result = await requestBill(user.companyId, tableId);

    if (result.success) {
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "table-session-changed", {
        tableId,
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
    const result = await withinTransaction(async () => {
      return addRound(tableId, items);
    });

    if (result.success) {
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "table-round-added", {
        tableId,
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
    const result = await transferTable(user.companyId, tableId, newWaiterId);

    if (result.success) {
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "table-waiter-changed", {
        tableId,
        newWaiterId,
      });
    }
    return result;
  },
);

export const getWaitersAction = protectedAction(
  { resource: "tables", action: "read" },
  async (user): Promise<response<Array<{ id: string; name: string | null }>>> => {
    return getWaiters(user.companyId);
  },
);
