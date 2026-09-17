import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import prisma from "@/lib/prisma";
import { findRecentSales, orderStatusLabel } from "@/dashboard/db_repository";

const companyId = randomUUID();
const orderIds = [randomUUID(), randomUUID(), randomUUID()];
const startDate = new Date("2026-01-01T00:00:00.000Z");
const endDate = new Date("2026-01-02T00:00:00.000Z");
let seeded = false;

beforeAll(async () => {
  const db = prisma();
  await db.company.create({ data: { id: companyId, address: "QA" } });
  await db.order.createMany({
    data: [
      {
        id: orderIds[0],
        companyId,
        status: "COMPLETED",
        paymentStatus: "PAID",
        discountAmount: 0,
        netTotal: 10,
        total: 10,
        createdAt: new Date("2026-01-01T00:00:01.000Z"),
      },
      {
        id: orderIds[1],
        companyId,
        status: "CANCELLED",
        paymentStatus: "PAID",
        discountAmount: 0,
        netTotal: 20,
        total: 20,
        createdAt: new Date("2026-01-01T00:00:02.000Z"),
      },
      {
        id: orderIds[2],
        companyId,
        status: "PENDING",
        paymentStatus: "PAID",
        discountAmount: 0,
        netTotal: 30,
        total: 30,
        createdAt: new Date("2026-01-01T00:00:03.000Z"),
      },
    ],
  });
  seeded = true;
});

afterAll(async () => {
  if (!seeded) return;
  const db = prisma();
  await db.order.deleteMany({ where: { id: { in: orderIds } } });
  await db.company.delete({ where: { id: companyId } });
});

describe("dashboard recent sales PostgreSQL integration", () => {
  test("derives the label only from Order.status when all orders are paid", async () => {
    const result = await findRecentSales({
      companyId,
      period: "custom",
      startDate,
      endDate,
      bucket: "day",
      timezone: "UTC",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(
      Object.fromEntries(
        result.data.map((sale) => [
          sale.orderId,
          orderStatusLabel(sale.status),
        ]),
      ),
    ).toEqual({
      [orderIds[2]]: "Pendiente",
      [orderIds[1]]: "Anulada",
      [orderIds[0]]: "Completada",
    });
  });
});
