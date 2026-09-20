import { expect, test } from "vitest";
import {
  DishProductSchema,
  PackageProductSchema,
  ServiceProductSchema,
  SingleProductSchema,
} from "../schema";

const base = {
  companyId: "company-1",
  kitchenId: "11111111-1111-4111-8111-111111111111",
  name: "Producto",
  price: 10,
  description: "",
  categories: [],
};

test.each([
  [
    "simple",
    SingleProductSchema,
    { ...base, purchasePrice: 1, stock: 1, unitType: "unit" },
  ],
  ["pack", PackageProductSchema, { ...base, productItems: [] }],
  ["service", ServiceProductSchema, base],
  ["dish", DishProductSchema, base],
])("accepts an optional Kitchen for a %s product", (_name, schema, input) => {
  expect(schema.safeParse(input).success).toBe(true);
  expect(schema.safeParse({ ...input, kitchenId: null }).success).toBe(true);
  const { kitchenId: _kitchenId, ...withoutKitchen } = input;
  expect(schema.safeParse(withoutKitchen).success).toBe(true);
});
