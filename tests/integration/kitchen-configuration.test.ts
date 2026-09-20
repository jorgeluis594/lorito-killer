import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, test } from "vitest";
import prisma from "@/lib/prisma";
import {
  createKitchenConfiguration,
  updateKitchenConfiguration,
} from "@/kitchen/db_repository";
import { update } from "@/product/db_repository";
import {
  DishProductType,
  PackageProductType,
  type Product,
  ServiceProductType,
  SingleProductType,
} from "@/product/types";

const suffix = randomUUID();
const companyId = randomUUID();
const clientId = randomUUID();
const printerId = randomUUID();

beforeAll(async () => {
  await prisma().company.create({
    data: { id: companyId, address: "QA", name: `KIT-02 ${suffix}` },
  });
  await prisma().printClient.create({
    data: {
      id: clientId,
      companyId,
      machineName: `QA-${suffix}`,
      credentialHash: suffix,
      lastSeenAt: new Date(),
    },
  });
  await prisma().printer.create({
    data: {
      id: printerId,
      companyId,
      printClientId: clientId,
      localName: "PARRILLA",
      lastDetectedAt: new Date(),
    },
  });
});

afterAll(async () => {
  await prisma().product.deleteMany({ where: { companyId } });
  await prisma().kitchen.deleteMany({ where: { companyId } });
  await prisma().printer.deleteMany({ where: { companyId } });
  await prisma().printClient.deleteMany({ where: { companyId } });
  await prisma().company.deleteMany({ where: { id: companyId } });
  await prisma().$disconnect();
});

test("the database allows only one concurrent Kitchen assignment per printer", async () => {
  const results = await Promise.all([
    createKitchenConfiguration(companyId, {
      name: "Parrilla",
      status: "ACTIVE",
      printerId,
    }),
    createKitchenConfiguration(companyId, {
      name: "Cocina",
      status: "ACTIVE",
      printerId,
    }),
  ]);

  expect(results.filter((result) => result.success)).toHaveLength(1);
  expect(await prisma().kitchen.count({ where: { printerId } })).toBe(1);
});

test.for([
  { type: SingleProductType, productType: "SINGLE_PRODUCT" },
  { type: PackageProductType, productType: "PACKAGE_PRODUCT" },
  { type: ServiceProductType, productType: "SERVICE_PRODUCT" },
  { type: DishProductType, productType: "DISH" },
] as const)(
  "$type cannot be assigned while its Kitchen is deactivated",
  async ({ type, productType }) => {
    const kitchen = await prisma().kitchen.create({
      data: {
        companyId,
        name: `${type}-${randomUUID()}`,
        status: "ACTIVE",
      },
    });
    const stored = await prisma().product.create({
      data: {
        companyId,
        name: type,
        description: "",
        price: 10,
        hidden: false,
        productType,
        ...(type === SingleProductType
          ? { stock: 0, purchasePrice: 0, unitType: "UNIT" as const }
          : {}),
      },
    });
    const base = {
      id: stored.id,
      companyId,
      name: stored.name,
      description: stored.description,
      price: stored.price.toNumber(),
      hidden: false,
      categories: [],
      kitchenId: kitchen.id,
    };
    const product: Product =
      type === SingleProductType
        ? {
            ...base,
            type,
            stock: 0,
            purchasePrice: 0,
            unitType: "unit",
          }
        : type === PackageProductType
          ? { ...base, type, productItems: [] }
          : { ...base, type };

    const results = await Promise.all([
      update(product),
      updateKitchenConfiguration(companyId, kitchen.id, {
        name: kitchen.name,
        status: "INACTIVE",
      }),
    ]);

    expect(results.filter((result) => result.success)).toHaveLength(1);
    const [finalProduct, finalKitchen] = await Promise.all([
      prisma().product.findUniqueOrThrow({ where: { id: stored.id } }),
      prisma().kitchen.findUniqueOrThrow({ where: { id: kitchen.id } }),
    ]);
    expect(
      finalProduct.hidden === false &&
        finalProduct.kitchenId === kitchen.id &&
        finalKitchen.status === "INACTIVE",
    ).toBe(false);
  },
);
