import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  aggregate: vi.fn(),
  findMany: vi.fn(),
  findZone: vi.fn(),
  createZone: vi.fn(),
  createMany: vi.fn(),
  findTable: vi.fn(),
  countSessions: vi.fn(),
  updateTable: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: () => ({
    table: {
      aggregate: mocks.aggregate,
      findMany: mocks.findMany,
      findFirst: mocks.findTable,
      update: mocks.updateTable,
    },
    tableSession: { count: mocks.countSessions },
    $transaction: mocks.transaction,
  }),
}));

import {
  createTables,
  deleteTable,
  findTableConfiguration,
} from "../db_repository";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.aggregate.mockResolvedValue({ _max: { number: null } });
  mocks.findZone.mockResolvedValue(null);
  mocks.createZone.mockResolvedValue({ id: "salon" });
  mocks.createMany.mockResolvedValue({ count: 3 });
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      table: { aggregate: mocks.aggregate, createMany: mocks.createMany },
      zone: { findFirst: mocks.findZone, create: mocks.createZone },
    }),
  );
});

test("creates the default room and consecutive tables atomically for the authenticated company", async () => {
  expect(
    await createTables("company-a", { quantity: 3, startNumber: 1 }),
  ).toEqual({
    success: true,
    data: { firstNumber: 1, lastNumber: 3 },
  });
  expect(mocks.aggregate).toHaveBeenCalledWith({
    where: { companyId: "company-a" },
    _max: { number: true },
  });
  expect(mocks.findZone).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { companyId: "company-a", active: true },
    }),
  );
  expect(mocks.createZone).toHaveBeenCalledWith({
    data: { companyId: "company-a", name: "Salón" },
  });
  expect(mocks.createMany).toHaveBeenCalledWith({
    data: [1, 2, 3].map((number) => ({
      companyId: "company-a",
      zoneId: "salon",
      number,
    })),
  });
  expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: "Serializable",
  });
});

test("continues numbering after retired tables and reuses the existing room", async () => {
  mocks.aggregate.mockResolvedValue({ _max: { number: 12 } });
  mocks.findZone.mockResolvedValue({ id: "existing-room" });
  expect(
    await createTables("company-a", { quantity: 4, startNumber: 13 }),
  ).toEqual({
    success: true,
    data: { firstNumber: 13, lastNumber: 16 },
  });
  expect(mocks.createZone).not.toHaveBeenCalled();
  expect(mocks.createMany).toHaveBeenCalledWith({
    data: [13, 14, 15, 16].map((number) => ({
      companyId: "company-a",
      zoneId: "existing-room",
      number,
    })),
  });
});

test("rejects a stale preview before any write", async () => {
  mocks.aggregate.mockResolvedValue({ _max: { number: 16 } });
  expect(
    (await createTables("company-a", { quantity: 4, startNumber: 13 })).success,
  ).toBe(false);
  expect(mocks.createZone).not.toHaveBeenCalled();
  expect(mocks.createMany).not.toHaveBeenCalled();
});

test.for([0, -1, 1.5, 101, Infinity, NaN, "4", null])(
  "rejects invalid quantity %s before opening a transaction",
  async (quantity) => {
    expect(
      (
        await createTables("company-a", {
          quantity: quantity as number,
          startNumber: 1,
        })
      ).success,
    ).toBe(false);
    expect(mocks.transaction).not.toHaveBeenCalled();
  },
);

test.for(["P2002", "P2034"])(
  "returns a recoverable failure on %s without silently renumbering",
  async (code) => {
    mocks.transaction.mockRejectedValue({ code });
    expect(
      await createTables("company-a", { quantity: 3, startNumber: 1 }),
    ).toEqual({
      success: false,
      message: expect.stringContaining("Actualiza la página"),
    });
  },
);

test("returns only active configuration rows but preserves the highest historical number", async () => {
  mocks.findMany.mockResolvedValue([
    { id: "table-1", number: 1, label: null, sessions: [{ id: "session" }] },
  ]);
  mocks.aggregate.mockResolvedValue({ _max: { number: 12 } });
  expect(await findTableConfiguration("company-a")).toEqual({
    success: true,
    data: {
      tables: [{ id: "table-1", number: 1, label: null, inService: true }],
      nextNumber: 13,
    },
  });
  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { companyId: "company-a", active: true },
    }),
  );
});

test("refuses to retire an occupied table and keeps its history", async () => {
  mocks.findTable.mockResolvedValue({ id: "table-1" });
  mocks.countSessions.mockResolvedValue(1);
  expect((await deleteTable("table-1", "company-a")).success).toBe(false);
  expect(mocks.updateTable).not.toHaveBeenCalled();
  mocks.countSessions.mockResolvedValue(0);
  expect((await deleteTable("table-1", "company-a")).success).toBe(true);
  expect(mocks.findTable).toHaveBeenCalledWith({
    where: { id: "table-1", companyId: "company-a" },
  });
  expect(mocks.updateTable).toHaveBeenCalledWith({
    where: { id: "table-1" },
    data: { active: false },
  });
});
