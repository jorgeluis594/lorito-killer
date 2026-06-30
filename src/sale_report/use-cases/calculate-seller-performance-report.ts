import Decimal from "decimal.js";
import type { response } from "@/lib/types";
import type {
  SellerPerformanceReport,
  SellerPerformanceRow,
  SellerReportQuery,
  SellerSaleFact,
  SellerStatus,
} from "@/sale_report/types";

const UNASSIGNED_SELLER_KEY = "__unassigned__";
const UNASSIGNED_SELLER_NAME = "Sin vendedor asignado";

type SellerAccumulator = {
  sellerId: string | null;
  sellerName: string;
  sellerCode: string | null;
  sellerStatus: SellerStatus;
  salesCount: number;
  totalSold: Decimal;
  cancelledSalesCount: number;
  lastSaleAt?: Date;
};

function sellerKey(fact: SellerSaleFact) {
  return fact.sellerId ?? UNASSIGNED_SELLER_KEY;
}

function sellerName(fact: SellerSaleFact) {
  if (!fact.sellerId) return UNASSIGNED_SELLER_NAME;
  return fact.sellerName?.trim() || "Vendedor sin nombre";
}

function sellerStatus(fact: SellerSaleFact): SellerStatus {
  if (!fact.sellerId) return "unassigned";
  return fact.sellerActive ? "active" : "inactive";
}

function roundMetric(value: Decimal.Value) {
  return new Decimal(value).toDecimalPlaces(2).toNumber();
}

function sortSellerRows(
  left: SellerPerformanceRow,
  right: SellerPerformanceRow,
) {
  if (right.totalSold !== left.totalSold) {
    return right.totalSold - left.totalSold;
  }

  if (right.salesCount !== left.salesCount) {
    return right.salesCount - left.salesCount;
  }

  return left.sellerName.localeCompare(right.sellerName);
}

export function calculateSellerPerformanceReport(
  query: SellerReportQuery,
  facts: SellerSaleFact[],
): response<SellerPerformanceReport> {
  const sellers = new Map<string, SellerAccumulator>();

  for (const fact of facts) {
    const key = sellerKey(fact);
    const current = sellers.get(key) ?? {
      sellerId: fact.sellerId,
      sellerName: sellerName(fact),
      sellerCode: fact.sellerCode,
      sellerStatus: sellerStatus(fact),
      salesCount: 0,
      totalSold: new Decimal(0),
      cancelledSalesCount: 0,
    };

    current.salesCount += 1;
    current.totalSold = current.totalSold.plus(fact.total);

    if (
      !current.lastSaleAt ||
      fact.orderCreatedAt.getTime() > current.lastSaleAt.getTime()
    ) {
      current.lastSaleAt = fact.orderCreatedAt;
    }

    if (fact.orderStatus === "cancelled") {
      current.cancelledSalesCount += 1;
    }

    sellers.set(key, current);
  }

  const totalSold = Array.from(sellers.values()).reduce(
    (total, seller) => total.plus(seller.totalSold),
    new Decimal(0),
  );

  const salesCount = Array.from(sellers.values()).reduce(
    (total, seller) => total + seller.salesCount,
    0,
  );

  const rows = Array.from(sellers.values())
    .map((seller): SellerPerformanceRow => {
      const totalSoldNumber = roundMetric(seller.totalSold);
      const participationPercent = totalSold.eq(0)
        ? 0
        : roundMetric(seller.totalSold.div(totalSold).mul(100));

      return {
        sellerId: seller.sellerId,
        sellerName: seller.sellerName,
        sellerCode: seller.sellerCode,
        sellerStatus: seller.sellerStatus,
        salesCount: seller.salesCount,
        totalSold: totalSoldNumber,
        averageTicket:
          seller.salesCount === 0
            ? 0
            : roundMetric(seller.totalSold.div(seller.salesCount)),
        participationPercent,
        cancelledSalesCount: seller.cancelledSalesCount,
        lastSaleAt: seller.lastSaleAt,
      };
    })
    .sort(sortSellerRows);

  const topSeller = rows.find((row) => row.totalSold > 0);

  return {
    success: true,
    data: {
      query,
      kpis: {
        totalSold: roundMetric(totalSold),
        salesCount,
        averageTicket:
          salesCount === 0 ? 0 : roundMetric(totalSold.div(salesCount)),
        sellersWithSales: rows.filter(
          (row) => row.sellerId !== null && row.salesCount > 0,
        ).length,
        topSeller,
      },
      ranking: rows.filter((row) => row.totalSold > 0).slice(0, 10),
      rows,
    },
  };
}
