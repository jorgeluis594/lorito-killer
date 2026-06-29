import type { DocumentType } from "@/document/types";
import type { Status } from "@/order/types";

export type SellerReportStatus = "paid" | "cancelled" | "all";

export type SellerMode = "all" | "specific" | "unassigned";

export type SellerStatus = "active" | "inactive" | "unassigned";

export type SellerReportQuery = {
  companyId: string;
  startDate?: Date;
  endDate?: Date;
  sellerId?: string | null;
  sellerMode: SellerMode;
  status: SellerReportStatus;
  documentTypes?: DocumentType[];
  customerId?: string;
};

export type SellerSaleFact = {
  orderId: string;
  companyId: string;
  sellerId: string | null;
  sellerName: string | null;
  sellerCode: string | null;
  sellerActive: boolean | null;
  total: number;
  orderStatus: Status;
  documentType: DocumentType;
  orderCreatedAt: Date;
  customerName?: string;
  document?: {
    id: string;
    series: string;
    number: string;
  };
};

export type SalesReportQuery = SellerReportQuery & {
  pageNumber?: number;
  pageSize?: number;
};

export type SalesReportRow = {
  orderId: string;
  companyId: string;
  orderCreatedAt: Date;
  orderStatus: Status;
  documentType: DocumentType;
  total: number;
  customerName?: string;
  sellerId: string | null;
  sellerName: string;
  sellerCode: string | null;
  sellerStatus: SellerStatus;
  document?: {
    id: string;
    series: string;
    number: string;
  };
};

export type SellerPerformanceRow = {
  sellerId: string | null;
  sellerName: string;
  sellerCode: string | null;
  sellerStatus: SellerStatus;
  salesCount: number;
  totalSold: number;
  averageTicket: number;
  participationPercent: number;
  cancelledSalesCount: number;
  lastSaleAt?: Date;
};

export type SellerPerformanceReport = {
  query: SellerReportQuery;
  kpis: {
    totalSold: number;
    salesCount: number;
    averageTicket: number;
    sellersWithSales: number;
    topSeller?: SellerPerformanceRow;
  };
  ranking: SellerPerformanceRow[];
  rows: SellerPerformanceRow[];
};
