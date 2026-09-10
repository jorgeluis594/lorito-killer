import { afterEach, expect, test, vi } from "vitest";
import prisma, { setPrismaClient } from "@/lib/prisma";
import { update } from "../db_repository";
import {
  SingleProductSchema,
  PackageProductSchema,
  ServiceProductSchema,
} from "../schema";
import type { ProductService } from "../types";

const originalPrisma = prisma();
afterEach(() => setPrismaClient(originalPrisma));

const product: ProductService = {
  id: "product-1",
  companyId: "company-1",
  type: "ServiceProduct",
  name: "Producto",
  price: 10,
  description: "",
  categories: [],
  hidden: false,
};

test.each([SingleProductSchema, PackageProductSchema, ServiceProductSchema])(
  "validates stations on every product schema",
  (schema) => {
    const input = { ...product, unitType: "unit", stock: 1, productItems: [] };
    for (const preparationStation of ["KITCHEN", "BAR", null, undefined]) {
      const parsed = schema.parse({ ...input, preparationStation });
      expect(parsed.preparationStation).toBe(preparationStation);
    }
    expect(
      schema.safeParse({ ...input, preparationStation: "OTHER" }).success,
    ).toBe(false);
  },
);

test("updates a station, explicitly clears it, and preserves it when omitted", async () => {
  const write = vi.fn().mockResolvedValue({});
  setPrismaClient({ product: { update: write } } as never);
  for (const preparationStation of ["BAR", null, undefined] as const) {
    expect((await update({ ...product, preparationStation })).success).toBe(
      true,
    );
    expect(write).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ preparationStation }),
      }),
    );
  }
});

test("rejects invalid station updates before accessing the database", async () => {
  const write = vi.fn();
  setPrismaClient({ product: { update: write } } as never);
  expect(
    (await update({ ...product, preparationStation: "OTHER" } as never))
      .success,
  ).toBe(false);
  expect(write).not.toHaveBeenCalled();
});
