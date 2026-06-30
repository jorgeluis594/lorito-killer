import type { DashboardFilterState } from "@/dashboard/types";

type BuildDashboardFilterSearchParamsInput = {
  currentSearchParams: URLSearchParams;
  currentFilterState: DashboardFilterState;
  key: string;
  nextValue: string;
};

export function buildDashboardFilterSearchParams({
  currentSearchParams,
  currentFilterState,
  key,
  nextValue,
}: BuildDashboardFilterSearchParamsInput) {
  const params = new URLSearchParams(currentSearchParams.toString());
  params.set(key, nextValue);
  params.delete("page");

  if (key === "period") {
    if (nextValue === "custom") {
      params.set("start", currentFilterState.start);
      params.set("end", currentFilterState.end);
    } else {
      params.delete("start");
      params.delete("end");
    }
  }

  if (key === "start" || key === "end") {
    params.set("period", "custom");

    if (!params.get("start")) {
      params.set("start", currentFilterState.start);
    }

    if (!params.get("end")) {
      params.set("end", currentFilterState.end);
    }
  }

  return params;
}
