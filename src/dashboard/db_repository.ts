import {
  addDays,
  addHours,
  format,
  isAfter,
  isEqual,
  min,
} from "date-fns";
import {
  $Enums,
  type PaymentMethod,
  Prisma,
  type PrismaClient,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import type { response } from "@/lib/types";
import { isFeatureEnabled } from "@/feature-flags";
import {
  calculateAverageTicket,
  calculateCashDifference,
  calculateExpectedCash,
} from "@/dashboard/use-cases/calculate-dashboard-summary";
import type {
  DashboardCashShiftOption,
  DashboardCashSummary,
  DashboardFiltersData,
  DashboardKpis,
  DashboardQuery,
  DashboardSellerOption,
  PaymentMethodBreakdown,
  RecentSaleRow,
  SalesTrendPoint,
  TopProductRow,
  OperationalAlerts,
} from "@/dashboard/types";

type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type SalesTrendRawRow = {
  periodStart: Date;
  total: number | string | Prisma.Decimal | null;
  count: number | bigint | null;
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CREDIT_CARD: "Tarjeta de credito",
  DEBIT_CARD: "Tarjeta de debito",
  WALLET: "Billetera digital",
};

const STATUS_LABELS: Record<RecentSaleRow["status"], string> = {
  completed: "Completada",
  cancelled: "Anulada",
  pending: "Pendiente",
};

const numberFromDecimal = (
  value: Prisma.Decimal | number | string | null | undefined,
) => {
  if (value === null || value === undefined) return 0;
  return Number(value);
};

const buildOrderWhere = (
  query: DashboardQuery,
  status?: $Enums.OrderStatus | $Enums.OrderStatus[],
): Prisma.OrderWhereInput => ({
  companyId: query.companyId,
  createdAt: {
    gte: query.startDate,
    lte: query.endDate,
  },
  ...(status
    ? { status: Array.isArray(status) ? { in: status } : status }
    : {}),
  ...(query.cashShiftId ? { cashShiftId: query.cashShiftId } : {}),
  ...(query.sellerId ? { sellerId: query.sellerId } : {}),
});

const buildCompletedOrderWhere = (query: DashboardQuery) =>
  buildOrderWhere(query, "COMPLETED");

const buildSalesReportHref = (
  query: DashboardQuery,
  extra: Record<string, string | undefined> = {},
) => {
  const params = new URLSearchParams({
    start: query.startDate.toISOString(),
    end: query.endDate.toISOString(),
    status: "paid",
  });

  if (query.sellerId) {
    params.set("sellerMode", "specific");
    params.set("sellerId", query.sellerId);
  }

  Object.entries(extra).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  return `/dashboard/sales_reports?${params.toString()}`;
};

const salesTrendKey = (date: Date, bucket: DashboardQuery["bucket"]) =>
  format(date, bucket === "hour" ? "yyyy-MM-dd-HH" : "yyyy-MM-dd");

const salesTrendLabel = (date: Date, bucket: DashboardQuery["bucket"]) =>
  format(date, bucket === "hour" ? "HH:mm" : "dd/MM");

const salesTrendBucketEnd = (
  date: Date,
  bucket: DashboardQuery["bucket"],
) => (bucket === "hour" ? addHours(date, 1) : addDays(date, 1));

const fillSalesTrendBuckets = (
  query: DashboardQuery,
  rows: SalesTrendRawRow[],
): SalesTrendPoint[] => {
  const rowByKey = new Map(
    rows.map((row) => [salesTrendKey(row.periodStart, query.bucket), row]),
  );
  const points: SalesTrendPoint[] = [];
  let cursor = query.startDate;

  while (!isAfter(cursor, query.endDate)) {
    const key = salesTrendKey(cursor, query.bucket);
    const row = rowByKey.get(key);
    const bucketStart = new Date(cursor);
    const bucketEnd = min([salesTrendBucketEnd(bucketStart, query.bucket), query.endDate]);

    points.push({
      key,
      label: salesTrendLabel(bucketStart, query.bucket),
      total: numberFromDecimal(row?.total),
      count: Number(row?.count ?? 0),
      href: buildSalesReportHref(query, {
        start: bucketStart.toISOString(),
        end: bucketEnd.toISOString(),
      }),
    });

    const next = salesTrendBucketEnd(cursor, query.bucket);
    if (isEqual(next, cursor)) break;
    cursor = next;
  }

  return points;
};

const buildOrderSqlFilters = (query: DashboardQuery) => {
  const filters = [
    Prisma.sql`o."companyId" = ${query.companyId}`,
    Prisma.sql`o."status"::text = 'COMPLETED'`,
    Prisma.sql`o."createdAt" >= ${query.startDate}`,
    Prisma.sql`o."createdAt" <= ${query.endDate}`,
  ];

  if (query.cashShiftId) {
    filters.push(Prisma.sql`o."cashShiftId" = ${query.cashShiftId}`);
  }

  if (query.sellerId) {
    filters.push(Prisma.sql`o."sellerId" = ${query.sellerId}`);
  }

  return filters;
};

const buildCashShiftLabel = (openedAt: Date, status: $Enums.ShiftStatus) => {
  const date = format(openedAt, "dd/MM HH:mm");
  return `${status === "OPEN" ? "Abierta" : "Cerrada"} - ${date}`;
};

export async function findDashboardFilters(
  query: Pick<DashboardQuery, "companyId" | "startDate" | "endDate">,
): Promise<response<DashboardFiltersData>> {
  try {
    const [cashShifts, sellers, restaurantsEnabled] = await Promise.all([
      prisma().cashShift.findMany({
        where: {
          companyId: query.companyId,
          openedAt: { lte: query.endDate },
          OR: [
            { closedAt: null },
            { closedAt: { gte: query.startDate } },
            { openedAt: { gte: query.startDate, lte: query.endDate } },
          ],
        },
        select: {
          id: true,
          openedAt: true,
          status: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: [{ status: "asc" }, { openedAt: "desc" }],
        take: 50,
      }),
      prisma().user.findMany({
        where: {
          companyId: query.companyId,
          active: true,
          role: { in: ["ADMIN", "CASHIER", "SELLER"] },
        },
        select: { id: true, name: true, email: true },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      }),
      isFeatureEnabled(query.companyId, "restaurants"),
    ]);

    const cashShiftOptions: DashboardCashShiftOption[] = cashShifts.map(
      (cashShift) => ({
        id: cashShift.id,
        label: `${buildCashShiftLabel(cashShift.openedAt, cashShift.status)} - ${
          cashShift.user.name || cashShift.user.email
        }`,
        status: cashShift.status === "OPEN" ? "open" : "closed",
      }),
    );

    const sellerOptions: DashboardSellerOption[] = sellers.map((seller) => ({
      id: seller.id,
      label: seller.name || seller.email,
    }));

    return {
      success: true,
      data: {
        cashShifts: cashShiftOptions,
        sellers: sellerOptions,
        restaurantsEnabled,
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

async function findCashSummary(query: DashboardQuery): Promise<DashboardCashSummary> {
  const cashShifts = await prisma().cashShift.findMany({
    where: {
      companyId: query.companyId,
      ...(query.cashShiftId ? { id: query.cashShiftId } : {}),
      openedAt: { lte: query.endDate },
      OR: [
        { closedAt: null },
        { closedAt: { gte: query.startDate } },
        { openedAt: { gte: query.startDate, lte: query.endDate } },
      ],
    },
    select: {
      id: true,
      status: true,
      initialAmount: true,
      finalAmount: true,
      openedAt: true,
    },
    orderBy: [{ status: "asc" }, { openedAt: "desc" }],
  });

  if (cashShifts.length === 0) {
    return {
      status: "none",
      label: "Sin caja en el periodo",
      expectedCash: 0,
      openCount: 0,
      closedCount: 0,
    };
  }

  const cashShiftIds = cashShifts.map((cashShift) => cashShift.id);
  const [cashPayments, expenses] = await Promise.all([
    prisma().payment.aggregate({
      where: {
        cashShiftId: { in: cashShiftIds },
        method: "CASH",
        order: {
          companyId: query.companyId,
          status: "COMPLETED",
          createdAt: { gte: query.startDate, lte: query.endDate },
        },
      },
      _sum: { amount: true },
    }),
    prisma().expense.aggregate({
      where: {
        cashShiftId: { in: cashShiftIds },
      },
      _sum: { amount: true },
    }),
  ]);

  const initialAmount = cashShifts.reduce(
    (total, cashShift) => total + cashShift.initialAmount.toNumber(),
    0,
  );
  const finalAmount = cashShifts.every((cashShift) => cashShift.finalAmount)
    ? cashShifts.reduce(
        (total, cashShift) => total + cashShift.finalAmount!.toNumber(),
        0,
      )
    : undefined;
  const expectedCash = calculateExpectedCash({
    initialAmount,
    cashPayments: numberFromDecimal(cashPayments._sum.amount),
    expenses: numberFromDecimal(expenses._sum.amount),
  });
  const openCount = cashShifts.filter((cashShift) => cashShift.status === "OPEN").length;
  const closedCount = cashShifts.length - openCount;
  const difference = calculateCashDifference({
    initialAmount,
    cashPayments: numberFromDecimal(cashPayments._sum.amount),
    expenses: numberFromDecimal(expenses._sum.amount),
    finalAmount,
  });

  return {
    status: openCount > 0 && closedCount > 0
      ? "mixed"
      : openCount > 0
        ? "open"
        : "closed",
    label:
      cashShifts.length === 1
        ? buildCashShiftLabel(cashShifts[0].openedAt, cashShifts[0].status)
        : `${cashShifts.length} cajas en el periodo`,
    expectedCash,
    difference,
    openCount,
    closedCount,
    cashShiftId: cashShifts.length === 1 ? cashShifts[0].id : undefined,
  };
}

export async function findDashboardKpis(
  query: DashboardQuery,
): Promise<response<DashboardKpis>> {
  try {
    const [salesAggregate, cash] = await Promise.all([
      prisma().order.aggregate({
        where: buildCompletedOrderWhere(query),
        _sum: { total: true },
        _count: { _all: true },
      }),
      findCashSummary(query),
    ]);

    const paidSalesTotal = numberFromDecimal(salesAggregate._sum.total);
    const paidSalesCount = salesAggregate._count._all;

    return {
      success: true,
      data: {
        paidSalesTotal,
        paidSalesCount,
        averageTicket: calculateAverageTicket(paidSalesTotal, paidSalesCount),
        cash,
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function findSalesTrend(
  query: DashboardQuery,
): Promise<response<SalesTrendPoint[]>> {
  try {
    const rows = await prisma().$queryRaw<SalesTrendRawRow[]>(Prisma.sql`
      SELECT
        date_trunc(${query.bucket}, o."createdAt") AS "periodStart",
        COALESCE(SUM(o."total"), 0)::float AS "total",
        COUNT(o."id")::int AS "count"
      FROM "Order" o
      WHERE ${Prisma.join(buildOrderSqlFilters(query), " AND ")}
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    return { success: true, data: fillSalesTrendBuckets(query, rows) };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function findPaymentBreakdown(
  query: DashboardQuery,
): Promise<response<PaymentMethodBreakdown[]>> {
  try {
    const rows = await prisma().payment.groupBy({
      by: ["method"],
      where: {
        order: buildCompletedOrderWhere(query),
      },
      _sum: { amount: true },
    });
    const total = rows.reduce(
      (sum, row) => sum + numberFromDecimal(row._sum.amount),
      0,
    );

    return {
      success: true,
      data: rows
        .map((row) => {
          const amount = numberFromDecimal(row._sum.amount);
          return {
            method: row.method,
            label: PAYMENT_METHOD_LABELS[row.method],
            total: amount,
            percentage: total > 0 ? (amount / total) * 100 : 0,
            href: buildSalesReportHref(query, {
              paymentMethod: row.method.toLowerCase(),
            }),
          };
        })
        .sort((a, b) => b.total - a.total),
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

async function findTopProducts(
  query: DashboardQuery,
  orderBy: "amount" | "quantity",
): Promise<response<TopProductRow[]>> {
  try {
    const rows = await prisma().orderItem.groupBy({
      by: ["productId"],
      where: {
        order: buildCompletedOrderWhere(query),
      },
      _sum: {
        total: true,
        quantity: true,
      },
      orderBy:
        orderBy === "amount"
          ? { _sum: { total: "desc" } }
          : { _sum: { quantity: "desc" } },
      take: 10,
    });
    const productIds = rows.map((row) => row.productId);
    const products = await prisma().product.findMany({
      where: {
        companyId: query.companyId,
        id: { in: productIds },
      },
      select: { id: true, name: true },
    });
    const productById = new Map(products.map((product) => [product.id, product]));

    return {
      success: true,
      data: rows.map((row) => ({
        productId: row.productId,
        name: productById.get(row.productId)?.name || "Producto eliminado",
        total: numberFromDecimal(row._sum.total),
        quantity: numberFromDecimal(row._sum.quantity),
        href: buildSalesReportHref(query, { productId: row.productId }),
      })),
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export const findTopProductsByAmount = (query: DashboardQuery) =>
  findTopProducts(query, "amount");

export const findTopProductsByQuantity = (query: DashboardQuery) =>
  findTopProducts(query, "quantity");

export async function findRecentSales(
  query: DashboardQuery,
): Promise<response<RecentSaleRow[]>> {
  try {
    const orders = await prisma().order.findMany({
      where: buildOrderWhere(query, ["COMPLETED", "CANCELLED", "PENDING"]),
      select: {
        id: true,
        createdAt: true,
        total: true,
        status: true,
        seller: { select: { name: true, email: true } },
        payments: { select: { method: true } },
        documents: {
          select: { series: true, number: true, documentType: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    return {
      success: true,
      data: orders.map((order) => {
        const document = order.documents[0];
        const status =
          order.status === "COMPLETED"
            ? "completed"
            : order.status === "CANCELLED"
              ? "cancelled"
              : "pending";

        return {
          orderId: order.id,
          createdAt: order.createdAt,
          amount: order.total.toNumber(),
          documentLabel: document
            ? `${document.series}-${document.number}`
            : "Sin comprobante",
          sellerName: order.seller?.name || order.seller?.email || "Sin vendedor",
          paymentMethods:
            order.payments.length > 0
              ? Array.from(new Set(order.payments.map((payment) => PAYMENT_METHOD_LABELS[payment.method]))).join(", ")
              : "Sin pago",
          status,
          href: `/dashboard/orders/${order.id}`,
        };
      }),
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function findOperationalAlerts(
  query: DashboardQuery,
  options?: { restaurantsEnabled?: boolean },
): Promise<response<OperationalAlerts>> {
  try {
    const restaurantsEnabled =
      options?.restaurantsEnabled ?? (await isFeatureEnabled(query.companyId, "restaurants"));
    const [
      openCashShifts,
      openOrders,
      activeTables,
      zeroStockProducts,
      cancellations,
      cancellationAmount,
      discountedOrders,
      orderDiscounts,
      itemDiscounts,
    ] = await Promise.all([
      prisma().cashShift.count({
        where: {
          companyId: query.companyId,
          status: "OPEN",
        },
      }),
      prisma().order.count({
        where: buildOrderWhere(query, "PENDING"),
      }),
      restaurantsEnabled
        ? prisma().tableSession.count({
            where: {
              companyId: query.companyId,
              current: true,
              status: { in: ["OPEN", "BILL_REQUESTED"] },
            },
          })
        : Promise.resolve(0),
      prisma().product.count({
        where: {
          companyId: query.companyId,
          hidden: false,
          productType: "SINGLE_PRODUCT",
          stock: 0,
        },
      }),
      prisma().order.count({
        where: {
          companyId: query.companyId,
          status: "CANCELLED",
          updatedAt: { gte: query.startDate, lte: query.endDate },
          ...(query.sellerId ? { sellerId: query.sellerId } : {}),
        },
      }),
      prisma().order.aggregate({
        where: {
          companyId: query.companyId,
          status: "CANCELLED",
          updatedAt: { gte: query.startDate, lte: query.endDate },
          ...(query.sellerId ? { sellerId: query.sellerId } : {}),
        },
        _sum: { total: true },
      }),
      prisma().order.count({
        where: {
          ...buildOrderWhere(query, "COMPLETED"),
          OR: [
            { discountAmount: { gt: 0 } },
            { orderItems: { some: { discountAmount: { gt: 0 } } } },
          ],
        },
      }),
      prisma().order.aggregate({
        where: {
          ...buildOrderWhere(query, "COMPLETED"),
          discountAmount: { gt: 0 },
        },
        _sum: { discountAmount: true },
      }),
      prisma().orderItem.aggregate({
        where: {
          discountAmount: { gt: 0 },
          order: buildCompletedOrderWhere(query),
        },
        _sum: { discountAmount: true },
      }),
    ]);

    const operationCount = restaurantsEnabled ? activeTables : openOrders;
    const operationHref = restaurantsEnabled
      ? "/dashboard/tables"
      : "/dashboard/orders?status=pending";
    const discountTotal =
      numberFromDecimal(orderDiscounts._sum.discountAmount) +
      numberFromDecimal(itemDiscounts._sum.discountAmount);

    return {
      success: true,
      data: {
        items: [
          {
            id: "cash-shifts",
            title: "Cajas abiertas",
            value: String(openCashShifts),
            description:
              openCashShifts > 0
                ? "Revisar cierre y efectivo esperado."
                : "No hay cajas abiertas sin cierre.",
            href: "/dashboard/cash_shifts",
            severity: openCashShifts > 0 ? "warning" : "success",
          },
          {
            id: restaurantsEnabled ? "active-tables" : "open-orders",
            title: restaurantsEnabled ? "Mesas activas" : "Pedidos abiertos",
            value: String(operationCount),
            description:
              operationCount > 0
                ? "Operacion en curso, no suma a ventas cobradas."
                : "No hay operaciones abiertas.",
            href: operationHref,
            severity: operationCount > 0 ? "warning" : "success",
          },
          {
            id: "zero-stock",
            title: "Stock en cero",
            value: String(zeroStockProducts),
            description:
              zeroStockProducts > 0
                ? "Productos activos requieren reposicion."
                : "No hay productos con stock en cero.",
            href: "/dashboard/products?stock=zero",
            severity: zeroStockProducts > 0 ? "critical" : "success",
          },
          {
            id: "cancellations",
            title: "Anulaciones",
            value: String(cancellations),
            description: `Monto anulado: S/ ${numberFromDecimal(cancellationAmount._sum.total).toFixed(2)}`,
            href: buildSalesReportHref(query, { status: "cancelled" }),
            severity: cancellations > 0 ? "neutral" : "success",
          },
          {
            id: "discounts",
            title: "Descuentos",
            value: String(discountedOrders),
            description: `Total descontado: S/ ${discountTotal.toFixed(2)}`,
            href: buildSalesReportHref(query, { hasDiscount: "true" }),
            severity: discountedOrders > 0 ? "neutral" : "success",
          },
        ],
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export const dashboardRepository = {
  findDashboardFilters,
  findDashboardKpis,
  findOperationalAlerts,
  findSalesTrend,
  findPaymentBreakdown,
  findTopProductsByAmount,
  findTopProductsByQuantity,
  findRecentSales,
};

export type DashboardRepository = typeof dashboardRepository;

export function paymentMethodLabel(method: PaymentMethod) {
  return PAYMENT_METHOD_LABELS[method];
}

export function orderStatusLabel(status: RecentSaleRow["status"]) {
  return STATUS_LABELS[status];
}

export type DashboardDbClient = PrismaTransactionClient;
