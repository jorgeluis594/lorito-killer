import type { PaymentMethod } from "@prisma/client";

export type DashboardPeriod =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "this_month"
  | "custom";

export type DashboardBucket = "hour" | "day";

export type DashboardQuery = {
  companyId: string;
  period: DashboardPeriod;
  startDate: Date;
  endDate: Date;
  bucket: DashboardBucket;
  cashShiftId?: string;
  sellerId?: string;
  timezone: string;
};

export type DashboardFilterState = {
  period: DashboardPeriod;
  start: string;
  end: string;
  cashShiftId: string;
  sellerId: string;
};

export type DashboardCashShiftOption = {
  id: string;
  label: string;
  status: "open" | "closed";
};

export type DashboardSellerOption = {
  id: string;
  label: string;
};

export type DashboardFiltersData = {
  cashShifts: DashboardCashShiftOption[];
  sellers: DashboardSellerOption[];
  restaurantsEnabled: boolean;
};

export type DashboardCashSummary = {
  status: "open" | "closed" | "mixed" | "none";
  label: string;
  expectedCash: number;
  difference?: number;
  openCount: number;
  closedCount: number;
  cashShiftId?: string;
};

export type DashboardKpis = {
  paidSalesTotal: number;
  paidSalesCount: number;
  averageTicket: number;
  cash: DashboardCashSummary;
};

export type OperationalAlertSeverity = "critical" | "warning" | "neutral" | "success";

export type OperationalAlert = {
  id: string;
  title: string;
  value: string;
  description: string;
  href: string;
  severity: OperationalAlertSeverity;
};

export type OperationalAlerts = {
  items: OperationalAlert[];
};

export type SalesTrendPoint = {
  key: string;
  label: string;
  total: number;
  count: number;
  href: string;
};

export type PaymentMethodBreakdown = {
  method: PaymentMethod;
  label: string;
  total: number;
  percentage: number;
  href: string;
};

export type TopProductRow = {
  productId: string;
  name: string;
  total: number;
  quantity: number;
  href: string;
};

export type RecentSaleRow = {
  orderId: string;
  createdAt: Date;
  amount: number;
  documentLabel: string;
  sellerName: string;
  paymentMethods: string;
  status: "completed" | "cancelled" | "pending";
  href: string;
};

export type QuickAction = {
  title: string;
  description: string;
  href: string;
};

export type DashboardModule<T> =
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

export type DashboardSummary = {
  query: DashboardQuery;
  generatedAt: Date;
  filters: DashboardFiltersData;
  modules: {
    kpis: DashboardModule<DashboardKpis>;
    alerts: DashboardModule<OperationalAlerts>;
    salesTrend: DashboardModule<SalesTrendPoint[]>;
    paymentBreakdown: DashboardModule<PaymentMethodBreakdown[]>;
    topProductsByAmount: DashboardModule<TopProductRow[]>;
    topProductsByQuantity: DashboardModule<TopProductRow[]>;
    recentSales: DashboardModule<RecentSaleRow[]>;
    quickActions: DashboardModule<QuickAction[]>;
  };
};
