import { endOfDay, startOfDay, subDays } from "date-fns";
import { describe, expect, test } from "vitest";
import {
  getDefaultReportDateRange,
  reportDateRangeFromSearchParams,
  salesReportDocumentQueryFromSearchParams,
  sellerReportQueryFromSearchParams,
} from "@/sale_report/search-params";

const now = new Date("2026-06-28T16:30:00.000Z");

const expectedDefaultRange = () => ({
  startDate: startOfDay(subDays(now, 20)),
  endDate: endOfDay(now),
});

describe("report search params", () => {
  test("uses the shared default date range when URL dates are missing", () => {
    expect(getDefaultReportDateRange(now)).toEqual(expectedDefaultRange());
    expect(reportDateRangeFromSearchParams({}, now)).toEqual(
      expectedDefaultRange(),
    );
  });

  test("keeps explicit URL dates instead of replacing them with defaults", () => {
    const start = "2026-06-10T05:00:00.000Z";
    const end = "2026-06-12T04:59:59.999Z";

    expect(
      reportDateRangeFromSearchParams({ start, end }, now),
    ).toEqual({
      startDate: new Date(start),
      endDate: new Date(end),
    });
  });

  test("applies the default date range to seller report queries", () => {
    const query = sellerReportQueryFromSearchParams(
      {
        sellerMode: "unassigned",
        ticket: "true",
      },
      "company-1",
      now,
    );

    expect(query).toMatchObject({
      companyId: "company-1",
      ...expectedDefaultRange(),
      sellerMode: "unassigned",
      documentTypes: ["ticket"],
    });
  });

  test("defaults sales report document queries to paid sales in the default date range", () => {
    const query = salesReportDocumentQueryFromSearchParams(
      {
        sellerMode: "specific",
        sellerId: "seller-1",
        ticket: "true",
      },
      "company-1",
      { now },
    );

    expect(query).toEqual({
      companyId: "company-1",
      ...expectedDefaultRange(),
      orderStatus: "paid",
      pageNumber: 1,
      pageSize: 10,
      ticket: true,
      sellerMode: "specific",
      sellerId: "seller-1",
    });
  });

  test("keeps explicit sales status and pagination", () => {
    const query = salesReportDocumentQueryFromSearchParams(
      {
        status: "cancelled",
        page: "3",
        size: "25",
      },
      "company-1",
      { now },
    );

    expect(query).toMatchObject({
      orderStatus: "cancelled",
      pageNumber: 3,
      pageSize: 25,
    });
  });

  test("can build an unpaginated export query", () => {
    const query = salesReportDocumentQueryFromSearchParams(
      {},
      "company-1",
      { now, withPagination: false },
    );

    expect(query.pageNumber).toBeUndefined();
    expect(query.pageSize).toBeUndefined();
    expect(query.orderStatus).toBe("paid");
  });
});
