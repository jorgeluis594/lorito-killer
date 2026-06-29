import { z } from "zod";

export const dashboardPeriodSchema = z.enum([
  "today",
  "yesterday",
  "last_7_days",
  "this_month",
  "custom",
]);

export const dashboardSearchParamsSchema = z.object({
  period: dashboardPeriodSchema.catch("today"),
  start: z.string().optional(),
  end: z.string().optional(),
  cashShiftId: z.string().optional(),
  sellerId: z.string().optional(),
});

export type DashboardSearchParamsInput = z.input<
  typeof dashboardSearchParamsSchema
>;
