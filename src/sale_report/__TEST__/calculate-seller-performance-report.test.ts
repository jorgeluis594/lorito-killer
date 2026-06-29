import { describe, expect, test } from "vitest";
import { calculateSellerPerformanceReport } from "@/sale_report/use-cases/calculate-seller-performance-report";
import type {
  SellerReportQuery,
  SellerSaleFact,
} from "@/sale_report/types";

const createQuery = (
  status: SellerReportQuery["status"] = "all",
): SellerReportQuery => ({
  companyId: "company-1",
  sellerMode: "all",
  status,
});

const query = createQuery();

const createFact = (
  overrides: Partial<SellerSaleFact> = {},
): SellerSaleFact => ({
  orderId: "order-1",
  companyId: "company-1",
  sellerId: "seller-1",
  sellerName: "Ana",
  sellerCode: "A01",
  sellerActive: true,
  total: 100,
  orderStatus: "completed",
  documentType: "ticket",
  orderCreatedAt: new Date("2026-06-01T10:00:00.000Z"),
  ...overrides,
});

describe("calculateSellerPerformanceReport", () => {
  test("groups sales by seller and calculates totals, counts, averages and participation", () => {
    const result = calculateSellerPerformanceReport(query, [
      createFact({ orderId: "order-1", total: 100 }),
      createFact({ orderId: "order-2", total: 50 }),
      createFact({
        orderId: "order-3",
        sellerId: "seller-2",
        sellerName: "Bruno",
        sellerCode: "B02",
        total: 50,
      }),
    ]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.kpis).toMatchObject({
      totalSold: 200,
      salesCount: 3,
      averageTicket: 66.67,
      sellersWithSales: 2,
    });
    expect(result.data.kpis.topSeller?.sellerName).toBe("Ana");
    expect(result.data.rows).toMatchObject([
      {
        sellerId: "seller-1",
        sellerName: "Ana",
        salesCount: 2,
        totalSold: 150,
        averageTicket: 75,
        participationPercent: 75,
      },
      {
        sellerId: "seller-2",
        sellerName: "Bruno",
        salesCount: 1,
        totalSold: 50,
        averageTicket: 50,
        participationPercent: 25,
      },
    ]);
  });

  test("includes unassigned sales as their own category", () => {
    const result = calculateSellerPerformanceReport(query, [
      createFact({
        sellerId: null,
        sellerName: null,
        sellerCode: null,
        sellerActive: null,
        total: 80,
      }),
    ]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.rows).toMatchObject([
      {
        sellerId: null,
        sellerName: "Sin vendedor asignado",
        sellerStatus: "unassigned",
        salesCount: 1,
        totalSold: 80,
      },
    ]);
    expect(result.data.kpis.sellersWithSales).toBe(0);
  });

  test("reports paid status from completed facts returned by the repository filter", () => {
    const result = calculateSellerPerformanceReport(createQuery("paid"), [
      createFact({ orderId: "completed-1", total: 100 }),
      createFact({ orderId: "completed-2", total: 50 }),
    ]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.query.status).toBe("paid");
    expect(result.data.kpis).toMatchObject({
      totalSold: 150,
      salesCount: 2,
      averageTicket: 75,
      sellersWithSales: 1,
    });
    expect(result.data.rows[0]).toMatchObject({
      sellerName: "Ana",
      salesCount: 2,
      totalSold: 150,
      averageTicket: 75,
      cancelledSalesCount: 0,
    });
  });

  test("reports all status by summing completed and cancelled facts", () => {
    const result = calculateSellerPerformanceReport(createQuery("all"), [
      createFact({ orderId: "completed-1", total: 100 }),
      createFact({ orderId: "completed-2", total: 50 }),
      createFact({
        orderId: "cancelled",
        total: 999,
        orderStatus: "cancelled",
      }),
    ]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.query.status).toBe("all");
    expect(result.data.kpis).toMatchObject({
      totalSold: 1149,
      salesCount: 3,
      averageTicket: 383,
      sellersWithSales: 1,
    });
    expect(result.data.rows[0]).toMatchObject({
      sellerName: "Ana",
      salesCount: 3,
      totalSold: 1149,
      averageTicket: 383,
      cancelledSalesCount: 1,
    });
  });

  test("reports cancelled status from cancelled facts returned by the repository filter", () => {
    const result = calculateSellerPerformanceReport(createQuery("cancelled"), [
      createFact({
        orderId: "cancelled",
        total: 999,
        orderStatus: "cancelled",
      }),
    ]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.query.status).toBe("cancelled");
    expect(result.data.kpis).toMatchObject({
      totalSold: 999,
      salesCount: 1,
      averageTicket: 999,
      sellersWithSales: 1,
    });
    expect(result.data.rows[0]).toMatchObject({
      sellerName: "Ana",
      salesCount: 1,
      totalSold: 999,
      averageTicket: 999,
      cancelledSalesCount: 1,
    });
  });

  test("keeps inactive sellers in historical reports", () => {
    const result = calculateSellerPerformanceReport(query, [
      createFact({
        sellerId: "seller-inactive",
        sellerName: "Carla",
        sellerActive: false,
      }),
    ]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.rows[0]).toMatchObject({
      sellerId: "seller-inactive",
      sellerName: "Carla",
      sellerStatus: "inactive",
      totalSold: 100,
    });
  });

  test("returns zero metrics for an empty report", () => {
    const result = calculateSellerPerformanceReport(query, []);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.kpis).toEqual({
      totalSold: 0,
      salesCount: 0,
      averageTicket: 0,
      sellersWithSales: 0,
      topSeller: undefined,
    });
    expect(result.data.ranking).toEqual([]);
    expect(result.data.rows).toEqual([]);
  });

  test("sets last sale date from the latest fact considered by the report", () => {
    const older = new Date("2026-06-01T10:00:00.000Z");
    const newer = new Date("2026-06-03T10:00:00.000Z");
    const cancelledAfter = new Date("2026-06-04T10:00:00.000Z");

    const result = calculateSellerPerformanceReport(query, [
      createFact({ orderId: "older", orderCreatedAt: older }),
      createFact({ orderId: "newer", orderCreatedAt: newer }),
      createFact({
        orderId: "cancelled-after",
        orderStatus: "cancelled",
        orderCreatedAt: cancelledAfter,
      }),
    ]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.rows[0].lastSaleAt).toEqual(cancelledAfter);
  });
});
