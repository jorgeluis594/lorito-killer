import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  printerFind: vi.fn(),
  kitchenCreate: vi.fn(),
  kitchenFind: vi.fn(),
  kitchenUpdate: vi.fn(),
  productCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: () => ({ $transaction: mocks.transaction }),
}));

import {
  createKitchenConfiguration,
  updateKitchenConfiguration,
} from "../db_repository";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      $queryRaw: mocks.queryRaw,
      printer: { findFirst: mocks.printerFind },
      kitchen: {
        create: mocks.kitchenCreate,
        findFirst: mocks.kitchenFind,
        update: mocks.kitchenUpdate,
      },
      product: { count: mocks.productCount },
    }),
  );
  mocks.printerFind.mockResolvedValue({ id: "printer-1" });
  mocks.kitchenFind.mockResolvedValue({ id: "kitchen-1" });
  mocks.productCount.mockResolvedValue(0);
});

test("creates a Kitchen with an active printer from the authenticated company", async () => {
  mocks.kitchenCreate.mockResolvedValue({ id: "kitchen-1" });
  expect(
    (
      await createKitchenConfiguration("company-1", {
        name: "Parrilla",
        status: "ACTIVE",
        printerId: "printer-1",
      })
    ).success,
  ).toBe(true);
  expect(mocks.printerFind).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: "printer-1", companyId: "company-1", status: "ACTIVE" },
    }),
  );
  expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: "Serializable",
  });
});

test("rejects concurrent exclusive printer assignments", async () => {
  mocks.transaction.mockRejectedValue({ code: "P2002" });
  expect(
    await createKitchenConfiguration("company-1", {
      name: "Bar",
      status: "ACTIVE",
      printerId: "printer-1",
    }),
  ).toEqual({
    success: false,
    message: "La impresora ya está asignada a otra Kitchen",
  });
});

test("does not deactivate a Kitchen with active products", async () => {
  mocks.productCount.mockResolvedValue(1);
  const result = await updateKitchenConfiguration("company-1", "kitchen-1", {
    name: "Parrilla",
    status: "INACTIVE",
  });
  expect(result.success).toBe(false);
  expect(mocks.kitchenUpdate).not.toHaveBeenCalled();
});
