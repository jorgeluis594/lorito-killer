import { beforeEach, expect, test, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { find } from "@/order/db_repository";
import { getMany } from "@/document/db_repository";
import { canCancelOrder } from "@/order/use-cases/can-cancel-order";

const db = vi.hoisted(() => ({
  order: { findUnique: vi.fn() },
  orderItem: { findMany: vi.fn() },
  product: { findMany: vi.fn() },
  payment: { findMany: vi.fn() },
  document: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: () => db }));
vi.mock("@/lib/log", () => ({ log: { info: vi.fn() } }));
vi.mock("@/customer/db_repository", () => ({ findCustomer: vi.fn() }));
vi.mock("@/product/db_repository", () => ({
  UNIT_TYPE_MAPPER: { UNIT: "unit" },
}));

beforeEach(() => vi.clearAllMocks());

test.for([
  { types: ["DISH"], paymentStatus: "PAID", expected: false },
  { types: ["SINGLE_PRODUCT", "DISH"], paymentStatus: "PAID", expected: false },
  {
    types: ["SINGLE_PRODUCT", "PACKAGE_PRODUCT", "SERVICE_PRODUCT"],
    paymentStatus: "PAID",
    expected: true,
  },
  { types: ["DISH"], paymentStatus: "PENDING", expected: true },
])(
  "$types / $paymentStatus gives the same eligibility in order and report",
  async ({ types, paymentStatus, expected }) => {
    const createdAt = new Date();
    const amount = new Prisma.Decimal(10);
    const items = types.map((type, index) => ({
      id: `item-${index}`,
      orderId: "order",
      productId: `product-${index}`,
      quantity: new Prisma.Decimal(1),
      netTotal: amount,
      total: amount,
      discountAmount: new Prisma.Decimal(0),
    }));
    db.order.findUnique.mockResolvedValue({
      id: "order",
      companyId: "company",
      status: "COMPLETED",
      documentType: "ticket",
      paymentStatus,
      createdAt,
      total: amount,
      netTotal: amount,
    });
    db.orderItem.findMany.mockResolvedValue(items);
    db.product.findMany.mockResolvedValue(
      types.map((type, index) => ({
        id: `product-${index}`,
        productType: type,
        unitType: "UNIT",
        name: type,
        price: amount,
      })),
    );
    db.payment.findMany.mockResolvedValue([]);
    db.document.findMany.mockResolvedValue([
      {
        id: "document",
        orderId: "order",
        companyId: "company",
        documentType: "TICKET",
        status: "REGISTERED",
        number: 1,
        series: "NV01",
        total: amount,
        netTotal: amount,
        order: {
          status: "COMPLETED",
          paymentStatus,
          createdAt,
          payments: [],
          orderItems: items
            .filter((_, index) => types[index] === "DISH")
            .slice(0, 1),
        },
      },
    ]);

    const orderResult = await find("order", "company");
    const reportResult = await getMany({ companyId: "company" });
    expect(orderResult.success).toBe(true);
    expect(reportResult.success).toBe(true);
    if (!orderResult.success || !reportResult.success)
      throw new Error("Failed to load sale");
    const order = orderResult.data;
    const report = reportResult.data[0];
    expect(order.hasDishProduct).toBe(types.includes("DISH"));
    expect(report.hasDishProduct).toBe(order.hasDishProduct);
    const eligibility = { hasPermission: true, documentStatus: report.status };
    expect(canCancelOrder({ ...eligibility, ...report })).toBe(expected);
    expect(
      canCancelOrder({
        ...eligibility,
        orderStatus: order.status,
        orderCreatedAt: order.createdAt,
        paymentStatus: order.paymentStatus,
        hasDishProduct: order.hasDishProduct!,
      }),
    ).toBe(expected);
    expect(db.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          order: {
            select: expect.objectContaining({
              paymentStatus: true,
              orderItems: {
                where: { quantity: { gt: 0 }, product: { productType: "DISH" } },
                select: { id: true },
                take: 1,
              },
            }),
          },
        },
      }),
    );
    expect(db.orderItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderId: { in: ["order"] }, quantity: { gt: 0 } },
      }),
    );
  },
);
