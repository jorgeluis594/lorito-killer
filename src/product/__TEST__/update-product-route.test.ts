import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  SingleProductType,
  UNIT_UNIT_TYPE,
  type Product,
} from "@/product/types";

const testContext = vi.hoisted(() => ({
  find: vi.fn(),
  findBy: vi.fn(),
  update: vi.fn(),
  user: {
    id: "user-1",
    name: "Test User",
    email: "user@example.com",
    companyId: "session-company",
    role: "ADMIN",
    active: true,
  },
}));

vi.mock("@/product/db_repository", () => ({
  find: testContext.find,
  findBy: testContext.findBy,
  update: testContext.update,
  deleteProduct: vi.fn(),
  orderByProductIdCount: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/authorization/server", () => ({
  protectedRoute:
    (
      _guard: unknown,
      handler: (request: Request, user: typeof testContext.user) => Promise<Response>,
    ) =>
    (request: Request) =>
      handler(request, testContext.user),
}));

import { PUT } from "@/app/api/products/[id]/route";

const product = (id: string): Product => ({
  id,
  companyId: "client-company",
  type: SingleProductType,
  sku: "SKU_123",
  name: "Producto de prueba",
  price: 10,
  purchasePrice: 5,
  unitType: UNIT_UNIT_TYPE,
  stock: 2,
  description: "Descripción",
  photos: [],
  categories: [],
  hidden: false,
});

const putProduct = (body: Product) =>
  PUT(
    new Request("http://localhost/api/products/product-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("PUT /api/products/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testContext.find.mockResolvedValue({ success: true, data: product("product-1") });
    testContext.update.mockImplementation(async (data: Product) => ({
      success: true,
      data,
    }));
  });

  test("allows keeping the current SKU and trusts URL/session identifiers", async () => {
    testContext.findBy.mockResolvedValue({
      success: true,
      data: product("product-1"),
    });

    const response = await putProduct(product("spoofed-product"));

    expect(response.status).toBe(200);
    expect(testContext.findBy).toHaveBeenCalledWith({
      sku: "SKU_123",
      companyId: testContext.user.companyId,
    });
    expect(testContext.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "product-1",
        companyId: testContext.user.companyId,
      }),
    );
  });

  test("rejects an SKU owned by another product", async () => {
    testContext.findBy.mockResolvedValue({
      success: true,
      data: product("product-2"),
    });

    const response = await putProduct(product("product-1"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: false,
      message: "Ya existe un producto con el sku",
    });
    expect(testContext.update).not.toHaveBeenCalled();
  });
});
