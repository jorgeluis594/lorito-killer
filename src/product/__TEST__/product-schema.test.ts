import { describe, expect, test } from "vitest";
import {
  PackageProductSchema,
  ServiceProductSchema,
  SingleProductSchema,
} from "@/product/schema";
import { KG_UNIT_TYPE } from "@/product/types";

describe("product schemas", () => {
  test("SingleProductSchema rejects empty company identifiers", () => {
    const product = {
      companyId: "",
      name: "Producto simple",
      price: 10,
      purchasePrice: 5,
      description: "Descripción",
      stock: 1,
      photos: [],
      unitType: KG_UNIT_TYPE,
      categories: [],
    };

    expect(SingleProductSchema.safeParse(product).success).toBe(false);
    expect(
      SingleProductSchema.safeParse({ ...product, companyId: "   " }).success,
    ).toBe(false);
  });

  test("PackageProductSchema rejects empty company identifiers", () => {
    const product = {
      companyId: "",
      name: "Paquete de prueba",
      price: 20,
      description: "Descripción",
      photos: [],
      categories: [],
      productItems: [],
    };

    expect(PackageProductSchema.safeParse(product).success).toBe(false);
    expect(
      PackageProductSchema.safeParse({ ...product, companyId: "   " }).success,
    ).toBe(false);
  });

  test("ServiceProductSchema rejects empty company identifiers", () => {
    const product = {
      companyId: "",
      name: "Servicio de prueba",
      price: 15,
      description: "Descripción",
      photos: [],
      categories: [],
    };

    expect(ServiceProductSchema.safeParse(product).success).toBe(false);
    expect(
      ServiceProductSchema.safeParse({ ...product, companyId: "   " }).success,
    ).toBe(false);
  });
});
