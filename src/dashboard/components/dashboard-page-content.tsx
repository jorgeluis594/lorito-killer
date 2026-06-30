import { Suspense } from "react";
import type { DashboardFiltersData, DashboardQuery } from "@/dashboard/types";
import { DashboardHeader } from "@/dashboard/components/dashboard-header";
import { KpiSummary } from "@/dashboard/components/kpi-summary";
import { OperationalAlerts } from "@/dashboard/components/operational-alerts";
import { SalesTrendChart } from "@/dashboard/components/sales-trend-chart";
import { PaymentMethodChart } from "@/dashboard/components/payment-method-chart";
import { TopProductsChart } from "@/dashboard/components/top-products-chart";
import { RecentSalesList } from "@/dashboard/components/recent-sales-list";
import { QuickActions } from "@/dashboard/components/quick-actions";
import {
  AlertSkeleton,
  ChartSkeleton,
  KpiSummarySkeleton,
  ListSkeleton,
} from "@/dashboard/components/skeletons";

export function DashboardPageContent({
  query,
  filters,
  generatedAt,
}: {
  query: DashboardQuery;
  filters: DashboardFiltersData;
  generatedAt: Date;
}) {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <DashboardHeader query={query} filters={filters} generatedAt={generatedAt} />

      <Suspense fallback={<KpiSummarySkeleton />}>
        <KpiSummary query={query} />
      </Suspense>

      <Suspense fallback={<AlertSkeleton />}>
        <OperationalAlerts
          query={query}
          restaurantsEnabled={filters.restaurantsEnabled}
        />
      </Suspense>

      <div className="grid gap-4 xl:grid-cols-7">
        <div className="space-y-4 xl:col-span-4">
          <Suspense fallback={<ChartSkeleton />}>
            <SalesTrendChart query={query} />
          </Suspense>
          <div className="grid gap-4 2xl:grid-cols-2">
            <Suspense fallback={<ChartSkeleton compact />}>
              <TopProductsChart query={query} mode="amount" />
            </Suspense>
            <Suspense fallback={<ChartSkeleton compact />}>
              <TopProductsChart query={query} mode="quantity" />
            </Suspense>
          </div>
        </div>

        <div className="space-y-4 xl:col-span-3">
          <Suspense fallback={<ChartSkeleton compact />}>
            <PaymentMethodChart query={query} />
          </Suspense>
          <Suspense fallback={<ListSkeleton />}>
            <RecentSalesList query={query} />
          </Suspense>
          <QuickActions restaurantsEnabled={filters.restaurantsEnabled} />
        </div>
      </div>
    </div>
  );
}
