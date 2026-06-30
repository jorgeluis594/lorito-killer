import { describe, expect, test } from "vitest";
import { normalizeSellerReportQuery } from "@/sale_report/use-cases/normalize-seller-report-query";

describe("normalizeSellerReportQuery", () => {
  test("defaults to paid status and all sellers", () => {
    const result = normalizeSellerReportQuery({
      companyId: "company-1",
    });

    expect(result).toEqual({
      success: true,
      data: {
        companyId: "company-1",
        startDate: undefined,
        endDate: undefined,
        sellerMode: "all",
        sellerId: undefined,
        status: "paid",
        documentTypes: undefined,
        customerId: undefined,
      },
    });
  });

  test("normalizes sellerId as a specific seller filter", () => {
    const result = normalizeSellerReportQuery({
      companyId: "company-1",
      sellerId: " seller-1 ",
      sellerMode: "all",
    });

    expect(result).toEqual({
      success: true,
      data: {
        companyId: "company-1",
        startDate: undefined,
        endDate: undefined,
        sellerMode: "specific",
        sellerId: "seller-1",
        status: "paid",
        documentTypes: undefined,
        customerId: undefined,
      },
    });
  });

  test("keeps unassigned mode without sellerId", () => {
    const result = normalizeSellerReportQuery({
      companyId: "company-1",
      sellerId: "seller-1",
      sellerMode: "unassigned",
    });

    expect(result).toEqual({
      success: true,
      data: {
        companyId: "company-1",
        startDate: undefined,
        endDate: undefined,
        sellerMode: "unassigned",
        sellerId: undefined,
        status: "paid",
        documentTypes: undefined,
        customerId: undefined,
      },
    });
  });

  test("returns an error when specific seller mode has no seller id", () => {
    const result = normalizeSellerReportQuery({
      companyId: "company-1",
      sellerMode: "specific",
    });

    expect(result).toEqual({
      success: false,
      message: "Seleccione un vendedor para filtrar",
    });
  });

  test("returns an error when start date is greater than end date", () => {
    const result = normalizeSellerReportQuery({
      companyId: "company-1",
      startDate: new Date("2026-06-03T00:00:00.000Z"),
      endDate: new Date("2026-06-01T00:00:00.000Z"),
    });

    expect(result).toEqual({
      success: false,
      message: "La fecha inicial no puede ser mayor a la final",
    });
  });

  test("filters invalid document types", () => {
    const result = normalizeSellerReportQuery({
      companyId: "company-1",
      documentTypes: ["ticket", "bad-value" as "ticket"],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.documentTypes).toEqual(["ticket"]);
  });
});
