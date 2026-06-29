import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { DashboardFiltersData, DashboardQuery } from "@/dashboard/types";
import { dashboardQueryToFilterState } from "@/dashboard/use-cases/normalize-dashboard-query";
import { formatDashboardDateRange, formatDashboardTime } from "@/dashboard/components/formatters";
import { DashboardFilters } from "@/dashboard/components/dashboard-filters";
import { RefreshButton } from "@/dashboard/components/refresh-button";

export function DashboardHeader({
  query,
  filters,
  generatedAt,
}: {
  query: DashboardQuery;
  filters: DashboardFiltersData;
  generatedAt: Date;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDashboardDateRange(query.startDate, query.endDate)} · Ultima
            actualizacion: {formatDashboardTime(generatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RefreshButton />
          <Button asChild>
            <Link href="/dashboard/orders/new">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Nueva venta
            </Link>
          </Button>
        </div>
      </div>
      <DashboardFilters
        value={dashboardQueryToFilterState(query)}
        cashShifts={filters.cashShifts}
        sellers={filters.sellers}
      />
    </div>
  );
}
