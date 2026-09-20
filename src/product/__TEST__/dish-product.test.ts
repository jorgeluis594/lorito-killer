import { beforeEach, expect, test, vi } from "vitest";
import { DishProductSchema } from "../schema";
import { DishProductType, type DishProduct } from "../types";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  kitchenFind: vi.fn(),
  productCreate: vi.fn(),
  productUpdate: vi.fn(),
  productFind: vi.fn(),
  categoryFind: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: () => ({
    $transaction: mocks.transaction,
    $queryRaw: mocks.queryRaw,
    kitchen: { findFirst: mocks.kitchenFind },
    product: { update: mocks.productUpdate, findFirst: mocks.productFind },
  }),
}));

import { create, update } from "../db_repository";

const dish: DishProduct = {
  companyId: "company-1",
  type: DishProductType,
  kitchenId: "f019cbbc-429b-46cd-9d87-7f619db34376",
  name: "Lomo saltado",
  price: 32,
  description: "",
  categories: [],
  hidden: false,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      $queryRaw: mocks.queryRaw,
      kitchen: { findFirst: mocks.kitchenFind },
      product: { create: mocks.productCreate, update: mocks.productUpdate },
      category: { findMany: mocks.categoryFind },
    }),
  );
  mocks.kitchenFind.mockResolvedValue({ id: dish.kitchenId });
  mocks.productFind.mockResolvedValue({ kitchenId: dish.kitchenId });
  mocks.categoryFind.mockResolvedValue([]);
  mocks.productCreate.mockResolvedValue({
    ...dish,
    id: "dish-1",
    productType: "DISH",
    sku: null,
    price: { toNumber: () => 32 },
    stock: null,
    unitType: null,
    purchasePrice: null,
    targetMovementProductId: null,
    targetMovementProductStock: null,
  });
  mocks.productUpdate.mockResolvedValue({ id: "dish-1" });
});

test("validates a DishProduct without inventory fields", () => {
  expect(DishProductSchema.safeParse(dish).success).toBe(true);
});

test("persists DISH inventory columns as null and validates its Kitchen", async () => {
  const result = await create(dish);
  expect(result.success).toBe(true);
  expect(mocks.kitchenFind).toHaveBeenCalledWith({
    where: { id: dish.kitchenId, companyId: "company-1", status: "ACTIVE" },
    select: { id: true },
  });
  expect(mocks.productCreate).toHaveBeenCalledWith({
    data: expect.objectContaining({
      productType: "DISH",
      stock: null,
      unitType: null,
      purchasePrice: null,
      targetMovementProductId: null,
      targetMovementProductStock: null,
    }),
  });
});

test("disconnects the Kitchen when updating without one", async () => {
  const result = await update({ ...dish, id: "dish-1", kitchenId: null });

  expect(result.success).toBe(true);
  expect(mocks.productUpdate).toHaveBeenCalledWith({
    where: { id: "dish-1", companyId: dish.companyId },
    data: expect.objectContaining({ kitchen: { disconnect: true } }),
  });
});

test("connects the Kitchen when updating with one", async () => {
  const result = await update({ ...dish, id: "dish-1" });

  expect(result.success).toBe(true);
  expect(mocks.productUpdate).toHaveBeenCalledWith({
    where: { id: "dish-1", companyId: dish.companyId },
    data: expect.objectContaining({
      kitchen: { connect: { id: dish.kitchenId } },
    }),
  });
});

test("preserves the Kitchen when kitchenId is omitted", async () => {
  const { kitchenId: _kitchenId, ...withoutKitchen } = dish;
  const result = await update({ ...withoutKitchen, id: "dish-1" });

  expect(result.success).toBe(true);
  expect(mocks.productUpdate).toHaveBeenCalledWith({
    where: { id: "dish-1", companyId: dish.companyId },
    data: expect.objectContaining({ kitchen: undefined }),
  });
});

test("omits the Kitchen relation when creating without one", async () => {
  await create({ ...dish, kitchenId: null });

  expect(mocks.productCreate).toHaveBeenCalledWith({
    data: expect.objectContaining({ kitchen: undefined }),
  });
});
