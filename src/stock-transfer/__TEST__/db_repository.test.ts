import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, test, vi } from "vitest";
import prisma, { setPrismaClient } from "@/lib/prisma";
import { getMany, total } from "@/stock-transfer/db_repository";

const originalPrisma = prisma();

afterEach(() => setPrismaClient(originalPrisma));

describe("stock transfer product filter", () => {
  test("filters the list and count by company and product", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(3);
    setPrismaClient({
      stockTransfer: { findMany, count },
    } as unknown as PrismaClient);

    await getMany({ companyId: "company-1", productId: "product-1" });
    await total("company-1", "product-1");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: "company-1",
          productId: "product-1",
          OR: undefined,
        },
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: { companyId: "company-1", productId: "product-1" },
    });
  });
});
