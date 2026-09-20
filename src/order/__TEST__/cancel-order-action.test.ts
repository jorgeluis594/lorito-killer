import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Document } from "@/document/types";
import type { response } from "@/lib/types";
import type { Order } from "@/order/types";

const mocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  findDocument: vi.fn(),
  findOrder: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/authorization/server", () => ({
  protectedAction:
    (_guard: unknown, action: (...args: any[]) => unknown) =>
    (...args: unknown[]) =>
      action(
        {
          id: "user-1",
          name: "Admin",
          email: "admin@example.com",
          companyId: "company-1",
          role: "ADMIN",
          active: true,
        },
        ...args,
      ),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/order/use-cases/cancel", () => ({ default: mocks.cancel }));
vi.mock("@/order/db_repository", () => ({
  create: vi.fn(),
  find: mocks.findOrder,
  update: vi.fn(),
}));
vi.mock("@/document/db_repository", () => ({
  createDocument: vi.fn(),
  findBillingDocumentFor: mocks.findDocument,
  getBillingCredentialsFor: vi.fn(),
  getLatestDocumentNumber: vi.fn(),
}));

import { cancelOrder } from "@/order/actions";

const order = {
  id: "order-1",
  companyId: "company-1",
  orderItems: [],
  netTotal: 10,
  discountAmount: 0,
  total: 10,
  status: "completed",
  payments: [],
  documentType: "ticket",
  createdAt: new Date(),
} satisfies Order;

const document = {
  id: "document-1",
  companyId: "company-1",
  orderId: "order-1",
  netTotal: 10,
  taxTotal: 0,
  discountAmount: 0,
  total: 10,
  documentType: "ticket",
  series: "NV01",
  number: "1",
  dateOfIssue: new Date(),
  status: "registered",
} satisfies Document;

describe("cancelOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findOrder.mockResolvedValue({ success: true, data: order });
    mocks.findDocument.mockResolvedValue({ success: true, data: document });
    mocks.cancel.mockResolvedValue({ success: true, data: order });
  });

  test.for([
    { paymentStatus: "paid", hasDishProduct: true, expected: false },
    { paymentStatus: "paid", hasDishProduct: false, expected: true },
    { paymentStatus: "pending", hasDishProduct: true, expected: true },
  ] as const)(
    "$paymentStatus with dishes=$hasDishProduct: $expected",
    async ({ paymentStatus, hasDishProduct, expected }) => {
      mocks.findOrder.mockResolvedValue({
        success: true,
        data: { ...order, paymentStatus, hasDishProduct },
      });
      expect((await cancelOrder("order-1", "Duplicada")).success).toBe(
        expected,
      );
      expect(mocks.cancel).toHaveBeenCalledTimes(expected ? 1 : 0);
    },
  );

  test("rejects an order from another company", async () => {
    mocks.findOrder.mockResolvedValue({
      success: false,
      message: "Order not found",
    } satisfies response<Order>);

    await expect(cancelOrder("order-1", "Duplicada")).resolves.toMatchObject({
      success: false,
      message: "No se encontró la venta",
    });
    expect(mocks.findOrder).toHaveBeenCalledWith("order-1", "company-1");
    expect(mocks.findDocument).toHaveBeenCalledWith("order-1", "company-1");
    expect(mocks.cancel).not.toHaveBeenCalled();
  });

  test("rejects a sale whose state changed before confirmation", async () => {
    mocks.findOrder.mockResolvedValue({
      success: true,
      data: { ...order, status: "cancelled" },
    });

    await expect(cancelOrder("order-1", "Duplicada")).resolves.toMatchObject({
      success: false,
      message: "Esta venta ya no puede anularse",
    });
    expect(mocks.cancel).not.toHaveBeenCalled();
  });

  test("trims the reason and cancels the server-loaded sale", async () => {
    await cancelOrder("order-1", "  Duplicada  ");

    expect(mocks.cancel).toHaveBeenCalledWith(order, document, "Duplicada");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/dashboard/sales_reports",
    );
  });
});
