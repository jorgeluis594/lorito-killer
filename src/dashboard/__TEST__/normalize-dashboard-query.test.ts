import { describe, expect, test } from "vitest";
import { normalizeDashboardQuery } from "@/dashboard/use-cases/normalize-dashboard-query";

const now = new Date(2026, 5, 28, 14, 30, 0, 0);

describe("normalizeDashboardQuery", () => {
  test("defaults to today with hourly buckets", () => {
    const result = normalizeDashboardQuery({
      companyId: "company-1",
      searchParams: {},
      now,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toMatchObject({
      companyId: "company-1",
      period: "today",
      bucket: "hour",
      cashShiftId: undefined,
      sellerId: undefined,
      timezone: "America/Lima",
    });
    expect(result.data.startDate).toEqual(new Date(2026, 5, 28, 0, 0, 0, 0));
    expect(result.data.endDate).toEqual(new Date(2026, 5, 28, 23, 59, 59, 999));
  });

  test("normalizes yesterday", () => {
    const result = normalizeDashboardQuery({
      companyId: "company-1",
      searchParams: { period: "yesterday" },
      now,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.bucket).toBe("hour");
    expect(result.data.startDate).toEqual(new Date(2026, 5, 27, 0, 0, 0, 0));
    expect(result.data.endDate).toEqual(new Date(2026, 5, 27, 23, 59, 59, 999));
  });

  test("normalizes last 7 days with daily buckets", () => {
    const result = normalizeDashboardQuery({
      companyId: "company-1",
      searchParams: { period: "last_7_days" },
      now,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.bucket).toBe("day");
    expect(result.data.startDate).toEqual(new Date(2026, 5, 22, 0, 0, 0, 0));
    expect(result.data.endDate).toEqual(new Date(2026, 5, 28, 23, 59, 59, 999));
  });

  test("normalizes this month", () => {
    const result = normalizeDashboardQuery({
      companyId: "company-1",
      searchParams: { period: "this_month" },
      now,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.bucket).toBe("day");
    expect(result.data.startDate).toEqual(new Date(2026, 5, 1, 0, 0, 0, 0));
    expect(result.data.endDate).toEqual(new Date(2026, 5, 30, 23, 59, 59, 999));
  });

  test("normalizes custom dates and trims ids", () => {
    const result = normalizeDashboardQuery({
      companyId: "company-1",
      searchParams: {
        period: "custom",
        start: "2026-06-10",
        end: "2026-06-12",
        cashShiftId: " shift-1 ",
        sellerId: " seller-1 ",
      },
      now,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toMatchObject({
      period: "custom",
      bucket: "day",
      cashShiftId: "shift-1",
      sellerId: "seller-1",
    });
    expect(result.data.startDate).toEqual(new Date(2026, 5, 10, 0, 0, 0, 0));
    expect(result.data.endDate).toEqual(new Date(2026, 5, 12, 23, 59, 59, 999));
  });

  test("uses today's range when custom has no dates yet", () => {
    const result = normalizeDashboardQuery({
      companyId: "company-1",
      searchParams: {
        period: "custom",
      },
      now,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toMatchObject({
      period: "custom",
      bucket: "day",
    });
    expect(result.data.startDate).toEqual(new Date(2026, 5, 28, 0, 0, 0, 0));
    expect(result.data.endDate).toEqual(new Date(2026, 5, 28, 23, 59, 59, 999));
  });

  test("returns an error for invalid custom ranges", () => {
    const result = normalizeDashboardQuery({
      companyId: "company-1",
      searchParams: {
        period: "custom",
        start: "2026-06-12",
        end: "2026-06-10",
      },
      now,
    });

    expect(result).toEqual({
      success: false,
      message: "La fecha inicial no puede ser mayor a la final",
    });
  });
});
