import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  SingleProductType,
  UNIT_UNIT_TYPE,
  type Product,
} from "@/product/types";

const testContext = vi.hoisted(() => ({
  create: vi.fn(),
  findBy: vi.fn(),
  getMany: vi.fn(),
  revalidatePath: vi.fn(),
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
  create: testContext.create,
  findBy: testContext.findBy,
  getMany: testContext.getMany,
}));

vi.mock("next/cache", () => ({
  revalidatePath: testContext.revalidatePath,
}));

vi.mock("@/authorization/server", () => ({
  protectedRoute:
    (
      _guard: unknown,
      handler: (request: Request, user: typeof testContext.user) => Promise<Response>,
    ) =>
    (request: Request) =>
      handler(request, testContext.user),
}));

import { POST } from "@/app/api/products/route";

const createSingleProduct = (
  companyId: string,
  sku?: string,
): Product => ({
  companyId,
  type: SingleProductType,
  sku,
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

const postProduct = (product: Product) =>
  POST(
    new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    }),
  );

describe("POST /api/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testContext.findBy.mockResolvedValue({
      success: false,
      message: "Producto no encontrado",
    });
    testContext.create.mockImplementation(async (product: Product) => ({
      success: true,
      data: {
        ...product,
        id: `product-${testContext.create.mock.calls.length}`,
      },
    }));
  });

  test("uses the authenticated company for two consecutive creations", async () => {
    const firstResponse = await postProduct(
      createSingleProduct("client-company"),
    );
    const secondResponse = await postProduct(createSingleProduct(""));

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(testContext.create).toHaveBeenCalledTimes(2);
    expect(testContext.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ companyId: testContext.user.companyId }),
    );
    expect(testContext.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ companyId: testContext.user.companyId }),
    );
  });

  for (const companyId of ["", "another-company"]) {
    test(`replaces companyId ${JSON.stringify(companyId)} before SKU lookup and persistence`, async () => {
      const response = await postProduct(
        createSingleProduct(companyId, "SKU_123"),
      );

      expect(response.status).toBe(201);
      expect(testContext.findBy).toHaveBeenCalledWith({
        sku: "SKU_123",
        companyId: testContext.user.companyId,
      });
      expect(testContext.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: testContext.user.companyId }),
      );
    });
  }
});
