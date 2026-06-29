import {
  addDays,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
import type { response } from "@/lib/types";
import { dashboardSearchParamsSchema } from "@/dashboard/schemas";
import type {
  DashboardFilterState,
  DashboardPeriod,
  DashboardQuery,
} from "@/dashboard/types";

export type DashboardSearchParams = Record<string, string | string[] | undefined>;

type NormalizeDashboardQueryInput = {
  companyId: string;
  searchParams?: DashboardSearchParams;
  now?: Date;
  timezone?: string;
};

const DEFAULT_TIMEZONE = "America/Lima";

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const normalizeOptionalId = (value: string | undefined) => {
  const normalized = value?.trim();
  if (!normalized || normalized === "all") return undefined;
  return normalized;
};

const parseDateOnly = (value: string | undefined): Date | null => {
  if (!value) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeRawSearchParams = (searchParams: DashboardSearchParams = {}) => {
  return dashboardSearchParamsSchema.parse({
    period: firstValue(searchParams.period),
    start: firstValue(searchParams.start),
    end: firstValue(searchParams.end),
    cashShiftId: firstValue(searchParams.cashShiftId),
    sellerId: firstValue(searchParams.sellerId),
  });
};

const resolveRange = ({
  period,
  now,
  start,
  end,
}: {
  period: DashboardPeriod;
  now: Date;
  start?: string;
  end?: string;
}): response<{ startDate: Date; endDate: Date }> => {
  if (period === "today") {
    return {
      success: true,
      data: { startDate: startOfDay(now), endDate: endOfDay(now) },
    };
  }

  if (period === "yesterday") {
    const yesterday = subDays(now, 1);
    return {
      success: true,
      data: { startDate: startOfDay(yesterday), endDate: endOfDay(yesterday) },
    };
  }

  if (period === "last_7_days") {
    return {
      success: true,
      data: {
        startDate: startOfDay(subDays(now, 6)),
        endDate: endOfDay(now),
      },
    };
  }

  if (period === "this_month") {
    return {
      success: true,
      data: {
        startDate: startOfMonth(now),
        endDate: endOfDay(endOfMonth(now)),
      },
    };
  }

  if (!start && !end) {
    return {
      success: true,
      data: { startDate: startOfDay(now), endDate: endOfDay(now) },
    };
  }

  const customStart = parseDateOnly(start);
  const customEnd = parseDateOnly(end);

  if (!customStart || !customEnd) {
    return {
      success: false,
      message: "Seleccione una fecha inicial y final validas",
    };
  }

  const startDate = startOfDay(customStart);
  const endDate = endOfDay(customEnd);

  if (startDate > endDate) {
    return {
      success: false,
      message: "La fecha inicial no puede ser mayor a la final",
    };
  }

  return { success: true, data: { startDate, endDate } };
};

export function normalizeDashboardQuery({
  companyId,
  searchParams,
  now = new Date(),
  timezone = DEFAULT_TIMEZONE,
}: NormalizeDashboardQueryInput): response<DashboardQuery> {
  const parsed = normalizeRawSearchParams(searchParams);
  const range = resolveRange({
    period: parsed.period,
    now,
    start: parsed.start,
    end: parsed.end,
  });

  if (!range.success) return range;

  return {
    success: true,
    data: {
      companyId,
      period: parsed.period,
      startDate: range.data.startDate,
      endDate: range.data.endDate,
      bucket:
        parsed.period === "today" || parsed.period === "yesterday"
          ? "hour"
          : "day",
      cashShiftId: normalizeOptionalId(parsed.cashShiftId),
      sellerId: normalizeOptionalId(parsed.sellerId),
      timezone,
    },
  };
}

export function dashboardQueryToFilterState(
  query: DashboardQuery,
): DashboardFilterState {
  return {
    period: query.period,
    start: format(query.startDate, "yyyy-MM-dd"),
    end: format(query.endDate, "yyyy-MM-dd"),
    cashShiftId: query.cashShiftId ?? "all",
    sellerId: query.sellerId ?? "all",
  };
}

export function nextDay(date: Date) {
  return addDays(date, 1);
}
