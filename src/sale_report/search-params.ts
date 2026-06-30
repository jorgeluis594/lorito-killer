import type { DocumentType } from "@/document/types";
import type { SearchParams as DocumentSearchParams } from "@/document/types";
import { endOfDay, startOfDay, subDays } from "date-fns";
import type {
  SellerMode,
  SellerReportQuery,
  SellerReportStatus,
} from "@/sale_report/types";

export type ReportSearchParams = {
  [key: string]: string | string[] | undefined;
};

const validSellerStatuses = new Set<SellerReportStatus>([
  "paid",
  "cancelled",
  "all",
]);

const validSellerModes = new Set<SellerMode>([
  "all",
  "specific",
  "unassigned",
]);

export const DEFAULT_REPORT_DATE_RANGE_DAYS = 20;

export const searchParamAsString = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

const parseReportDate = (
  value: string | string[] | undefined,
): Date | undefined => {
  const rawValue = searchParamAsString(value);
  if (!rawValue) return undefined;

  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export function getDefaultReportDateRange(now = new Date()) {
  return {
    startDate: startOfDay(subDays(now, DEFAULT_REPORT_DATE_RANGE_DAYS)),
    endDate: endOfDay(now),
  };
}

type ReportDateRangeSearchParams = {
  start?: string | string[];
  end?: string | string[];
};

export function reportDateRangeFromSearchParams(
  searchParams: ReportDateRangeSearchParams,
  now = new Date(),
) {
  const defaultRange = getDefaultReportDateRange(now);

  return {
    startDate: parseReportDate(searchParams.start) ?? defaultRange.startDate,
    endDate: parseReportDate(searchParams.end) ?? defaultRange.endDate,
  };
}

export function copyReportSearchParams(searchParams: ReportSearchParams) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (key === "page" || key === "view") return;

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }

    if (value !== undefined) {
      params.set(key, value);
    }
  });

  return params;
}

export function sellerReportQueryFromSearchParams(
  searchParams: ReportSearchParams,
  companyId: string,
  now = new Date(),
): Partial<SellerReportQuery> & Pick<SellerReportQuery, "companyId"> {
  const documentTypes: DocumentType[] = [];
  if (searchParams.invoice === "true") documentTypes.push("invoice");
  if (searchParams.receipt === "true") documentTypes.push("receipt");
  if (searchParams.ticket === "true") documentTypes.push("ticket");

  const status = searchParamAsString(searchParams.status);
  const sellerMode = searchParamAsString(searchParams.sellerMode);
  const { startDate, endDate } = reportDateRangeFromSearchParams(
    searchParams,
    now,
  );

  return {
    companyId,
    startDate,
    endDate,
    sellerMode: validSellerModes.has(sellerMode as SellerMode)
      ? (sellerMode as SellerMode)
      : undefined,
    sellerId: searchParamAsString(searchParams.sellerId),
    status: validSellerStatuses.has(status as SellerReportStatus)
      ? (status as SellerReportStatus)
      : undefined,
    documentTypes: documentTypes.length ? documentTypes : undefined,
    customerId: searchParamAsString(searchParams.customerId),
  };
}

type SalesReportDocumentQueryOptions = {
  now?: Date;
  withPagination?: boolean;
};

export function salesReportDocumentQueryFromSearchParams(
  searchParams: ReportSearchParams,
  companyId: string,
  options: SalesReportDocumentQueryOptions = {},
): DocumentSearchParams {
  const { startDate, endDate } = reportDateRangeFromSearchParams(
    searchParams,
    options.now,
  );
  const status = searchParamAsString(searchParams.status);
  const sellerMode = searchParamAsString(searchParams.sellerMode);
  const sellerId = searchParamAsString(searchParams.sellerId);

  const params: DocumentSearchParams = {
    companyId,
    startDate,
    endDate,
    orderStatus: validSellerStatuses.has(status as SellerReportStatus)
      ? (status as SellerReportStatus)
      : "paid",
  };

  if (options.withPagination !== false) {
    params.pageNumber = Number(searchParamAsString(searchParams.page)) || 1;
    params.pageSize = Number(searchParamAsString(searchParams.size)) || 10;
  }

  if (searchParams.series && searchParams.number) {
    params.correlative = {
      number: searchParamAsString(searchParams.number)!,
      series: searchParamAsString(searchParams.series)!,
    };
  }

  if (searchParams.invoice === "true") {
    params.invoice = true;
  }

  if (searchParams.receipt === "true") {
    params.receipt = true;
  }

  if (searchParams.ticket === "true") {
    params.ticket = true;
  }

  if (searchParams.customerId) {
    params.customerId = searchParamAsString(searchParams.customerId);
  }

  if (sellerMode === "specific" || sellerMode === "unassigned") {
    params.sellerMode = sellerMode;
  }

  if (sellerId) {
    params.sellerId = sellerId;
  }

  return params;
}
