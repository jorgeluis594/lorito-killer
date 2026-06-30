import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { response } from "@/lib/types";
import type { DocumentType } from "@/document/types";
import type { Status } from "@/order/types";
import type {
  SalesReportQuery,
  SalesReportRow,
  SellerReportQuery,
  SellerSaleFact,
  SellerStatus,
} from "@/sale_report/types";

const ORDER_STATUS_TO_PRISMA = {
  pending: "PENDING",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
} as const;

const PRISMA_ORDER_STATUS_TO_STATUS: Record<string, Status> = {
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const validDocumentTypes = new Set<DocumentType>([
  "invoice",
  "receipt",
  "ticket",
]);

function toDocumentType(documentType: string | null): DocumentType {
  if (documentType && validDocumentTypes.has(documentType as DocumentType)) {
    return documentType as DocumentType;
  }

  return "ticket";
}

function toSellerStatus(seller: { active: boolean } | null): SellerStatus {
  if (!seller) return "unassigned";
  return seller.active ? "active" : "inactive";
}

function toSellerName(
  seller: { name: string | null; email?: string } | null,
): string {
  if (!seller) return "Sin vendedor asignado";
  return seller.name?.trim() || seller.email || "Vendedor sin nombre";
}

function buildOrderWhere(query: SellerReportQuery): Prisma.OrderWhereInput {
  const dateFilter: Prisma.DateTimeFilter = {};
  if (query.startDate) dateFilter.gte = query.startDate;
  if (query.endDate) dateFilter.lte = query.endDate;

  const where: Prisma.OrderWhereInput = {
    companyId: query.companyId,
  };

  if (query.status === "paid") {
    where.status = ORDER_STATUS_TO_PRISMA.completed;
  }

  if (query.status === "cancelled") {
    where.status = ORDER_STATUS_TO_PRISMA.cancelled;
  }

  if (query.status === "all") {
    where.status = {
      in: [
        ORDER_STATUS_TO_PRISMA.completed,
        ORDER_STATUS_TO_PRISMA.cancelled,
      ],
    };
  }

  if (query.startDate || query.endDate) {
    where.createdAt = dateFilter;
  }

  if (query.sellerMode === "specific") {
    where.sellerId = query.sellerId;
  }

  if (query.sellerMode === "unassigned") {
    where.sellerId = null;
  }

  if (query.documentTypes?.length) {
    where.documentType = { in: query.documentTypes };
  }

  if (query.customerId) {
    where.customerId = query.customerId;
  }

  return where;
}

const orderSelect = {
  id: true,
  companyId: true,
  sellerId: true,
  total: true,
  status: true,
  documentType: true,
  createdAt: true,
  seller: {
    select: {
      name: true,
      email: true,
      sellerCode: true,
      active: true,
    },
  },
  customer: {
    select: {
      legalName: true,
    },
  },
  documents: {
    select: {
      id: true,
      series: true,
      number: true,
    },
    orderBy: {
      dateOfIssue: "desc",
    },
    take: 1,
  },
} satisfies Prisma.OrderSelect;

type OrderReportRecord = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

function toSellerSaleFact(order: OrderReportRecord): SellerSaleFact {
  const document = order.documents[0];

  return {
    orderId: order.id,
    companyId: order.companyId ?? "",
    sellerId: order.sellerId,
    sellerName: order.seller?.name ?? null,
    sellerCode: order.seller?.sellerCode ?? null,
    sellerActive: order.seller?.active ?? null,
    total: Number(order.total),
    orderStatus: PRISMA_ORDER_STATUS_TO_STATUS[order.status],
    documentType: toDocumentType(order.documentType),
    orderCreatedAt: order.createdAt,
    customerName: order.customer?.legalName ?? undefined,
    document: document
      ? {
          id: document.id,
          series: document.series,
          number: String(document.number),
        }
      : undefined,
  };
}

function toSalesReportRow(order: OrderReportRecord): SalesReportRow {
  const fact = toSellerSaleFact(order);

  return {
    orderId: fact.orderId,
    companyId: fact.companyId,
    orderCreatedAt: fact.orderCreatedAt,
    orderStatus: fact.orderStatus,
    documentType: fact.documentType,
    total: fact.total,
    customerName: fact.customerName,
    sellerId: fact.sellerId,
    sellerName: toSellerName(order.seller),
    sellerCode: fact.sellerCode,
    sellerStatus: toSellerStatus(order.seller),
    document: fact.document,
  };
}

export async function findSellerSaleFacts(
  query: SellerReportQuery,
): Promise<response<SellerSaleFact[]>> {
  try {
    const orders = await prisma().order.findMany({
      where: buildOrderWhere(query),
      select: orderSelect,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: orders.map(toSellerSaleFact) };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function findSalesReportRows(
  query: SalesReportQuery,
): Promise<response<SalesReportRow[]>> {
  try {
    const orders = await prisma().order.findMany({
      where: buildOrderWhere(query),
      select: orderSelect,
      skip:
        query.pageNumber && query.pageSize
          ? (query.pageNumber - 1) * query.pageSize
          : undefined,
      take: query.pageSize,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: orders.map(toSalesReportRow) };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function countSalesReportRows(
  query: SalesReportQuery,
): Promise<response<number>> {
  try {
    const total = await prisma().order.count({
      where: buildOrderWhere(query),
    });

    return { success: true, data: total };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
