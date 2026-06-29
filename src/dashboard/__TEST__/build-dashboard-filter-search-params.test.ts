import { describe, expect, test } from "vitest";
import { buildDashboardFilterSearchParams } from "@/dashboard/use-cases/build-dashboard-filter-search-params";
import type { DashboardFilterState } from "@/dashboard/types";

const currentFilterState: DashboardFilterState = {
  period: "today",
  start: "2026-06-28",
  end: "2026-06-28",
  cashShiftId: "all",
  sellerId: "all",
};

describe("buildDashboardFilterSearchParams", () => {
  test("sets current visible range when switching to custom", () => {
    const params = buildDashboardFilterSearchParams({
      currentSearchParams: new URLSearchParams(),
      currentFilterState,
      key: "period",
      nextValue: "custom",
    });

    expect(params.toString()).toBe(
      "period=custom&start=2026-06-28&end=2026-06-28",
    );
  });

  test("clears custom dates when switching to a preset period", () => {
    const params = buildDashboardFilterSearchParams({
      currentSearchParams: new URLSearchParams(
        "period=custom&start=2026-06-10&end=2026-06-12&page=2",
      ),
      currentFilterState: {
        ...currentFilterState,
        period: "custom",
        start: "2026-06-10",
        end: "2026-06-12",
      },
      key: "period",
      nextValue: "last_7_days",
    });

    expect(params.toString()).toBe("period=last_7_days");
  });

  test("changing a date keeps the filter as custom and preserves the other date", () => {
    const params = buildDashboardFilterSearchParams({
      currentSearchParams: new URLSearchParams("period=custom"),
      currentFilterState,
      key: "start",
      nextValue: "2026-06-20",
    });

    expect(params.toString()).toBe(
      "period=custom&start=2026-06-20&end=2026-06-28",
    );
  });
});
