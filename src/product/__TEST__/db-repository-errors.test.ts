import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  SingleProductType,
  UNIT_UNIT_TYPE,
  type Product,
} from "@/product/types";

const testContext = vi.hoisted(() => ({
  prisma: {
    product: { create: vi.fn(), update: vi.fn() },
    category: { findMany: vi.fn() },
    photo: { findMany: vi.fn(), create: vi.fn() },
  },
  logError: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: () => testContext.prisma }));
vi.mock("@/lib/log", () => ({
  log: { error: testContext.logError },
}));

import { create, storePhotos } from "@/product/db_repository";
import productCreator from "@/product/use-cases/product-creator-v2";

const uploadedPhoto = {
  name: "foto privada",
  size: 100,
  type: "image/jpeg",
  key: "secret-key",
  url: "https://private.example/photo.jpg",
  lastModified: 1_725_888_000_000,
  appUrl: "https://uploadthing.example/app/photo.jpg",
  ufsUrl: "https://uploadthing.example/ufs/photo.jpg",
  fileHash: "hash",
};

const product: Product = {
  companyId: "company-1",
  type: SingleProductType,
  sku: "SKU_1",
  name: "Nombre privado",
  price: 10,
  purchasePrice: 5,
  unitType: UNIT_UNIT_TYPE,
  stock: 2,
  description: "Descripción privada",
  photos: [uploadedPhoto],
  categories: [],
  hidden: false,
};

describe("product repository error logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testContext.prisma.category.findMany.mockResolvedValue([]);
    testContext.prisma.product.update.mockResolvedValue({});
    testContext.prisma.photo.findMany.mockResolvedValue([]);
  });

  test("logs a safe event and hides a Prisma product creation error", async () => {
    const err = new Error("Prisma connection details");
    testContext.prisma.product.create.mockRejectedValue(err);

    const result = await create(product);

    expect(result).toEqual({
      success: false,
      message: "Ocurrió un error interno. Inténtalo nuevamente.",
    });
    expect(testContext.logError).toHaveBeenCalledWith(
      "create_product_failed",
      {
        companyId: "company-1",
        productId: undefined,
        productType: SingleProductType,
        imageCount: 1,
        stage: "create_product",
        err,
      },
    );
    expect(testContext.logError.mock.calls[0]?.[1]).not.toHaveProperty("name");
    expect(testContext.logError.mock.calls[0]?.[1]).not.toHaveProperty("photos");
  });

  test("distinguishes a partial creation when image relations fail", async () => {
    const err = new Error("relation failure");
    testContext.prisma.product.create.mockResolvedValue({
      ...product,
      id: "product-1",
      productType: "SINGLE_PRODUCT",
      sku: product.sku,
      stock: new Prisma.Decimal(product.stock),
      price: new Prisma.Decimal(product.price),
      purchasePrice: new Prisma.Decimal(product.purchasePrice),
      unitType: "UNIT",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testContext.prisma.product.update.mockRejectedValue(err);

    const result = await create(product);

    expect(result).toEqual({
      success: false,
      message:
        "El producto se creó, pero no se pudieron guardar sus imágenes. Recarga la lista antes de volver a intentarlo.",
    });
    expect(testContext.logError).toHaveBeenLastCalledWith(
      "create_product_relations_failed",
      expect.objectContaining({
        companyId: "company-1",
        productId: "product-1",
        productType: SingleProductType,
        imageCount: 1,
        stage: "store_photos_and_categories",
        err,
      }),
    );
    expect(testContext.prisma.product.update).toHaveBeenCalledWith({
      where: { id: "product-1" },
      data: {
        photos: {
          create: [
            {
              name: "foto privada",
              size: 100,
              key: "secret-key",
              type: "image/jpeg",
              url: "https://private.example/photo.jpg",
            },
          ],
        },
        categories: { connect: [] },
      },
    });
  });

  test("logs and hides an error storing photos on an existing product", async () => {
    const err = new Error("photo table failure");
    testContext.prisma.photo.create.mockRejectedValue(err);

    const result = await storePhotos("product-1", product.photos!);

    expect(result).toEqual({
      success: false,
      message: "No se pudo guardar la imagen del producto. Inténtalo nuevamente.",
    });
    expect(testContext.logError).toHaveBeenCalledWith(
      "store_product_photos_failed",
      expect.objectContaining({
        productId: "product-1",
        imageCount: 1,
        stage: "store_photos",
        err,
      }),
    );
  });

  test("stores only photo columns supported by Prisma", async () => {
    testContext.prisma.photo.create.mockResolvedValue(uploadedPhoto);

    await storePhotos("product-1", [uploadedPhoto]);

    expect(testContext.prisma.photo.create).toHaveBeenCalledWith({
      data: {
        name: "foto privada",
        size: 100,
        key: "secret-key",
        type: "image/jpeg",
        url: "https://private.example/photo.jpg",
        productId: "product-1",
      },
    });
  });

  test("keeps the duplicate SKU message without logging", async () => {
    const repository = {
      findBy: vi.fn().mockResolvedValue({ success: true, data: product }),
      create: vi.fn(),
    };

    const result = await productCreator(repository)(product);

    expect(result).toEqual({
      success: false,
      message: "Ya existe un producto con el sku",
    });
    expect(repository.create).not.toHaveBeenCalled();
    expect(testContext.logError).not.toHaveBeenCalled();
  });
});
