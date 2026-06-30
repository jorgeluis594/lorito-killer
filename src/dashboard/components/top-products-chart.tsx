import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import type { DashboardQuery, TopProductRow } from "@/dashboard/types";
import {
  findTopProductsByAmount,
  findTopProductsByQuantity,
} from "@/dashboard/db_repository";
import { ModuleErrorState } from "@/dashboard/components/module-error-state";
import { EmptyState } from "@/dashboard/components/empty-state";
import { TopProductsChart as TopProductsChartView } from "@/dashboard/components/dashboard-charts";
import {
  formatDashboardCurrency,
  formatDashboardNumber,
} from "@/dashboard/components/formatters";

function ProductRows({
  data,
  mode,
}: {
  data: TopProductRow[];
  mode: "amount" | "quantity";
}) {
  return (
    <div className="space-y-2">
      {data.slice(0, 5).map((product) => (
        <Link
          key={product.productId}
          href={product.href}
          className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/60"
        >
          <span className="min-w-0 truncate">{product.name}</span>
          <span className="shrink-0 font-medium">
            {mode === "amount"
              ? formatDashboardCurrency(product.total)
              : formatDashboardNumber(product.quantity)}
          </span>
        </Link>
      ))}
    </div>
  );
}

export async function TopProductsChart({
  query,
  mode,
}: {
  query: DashboardQuery;
  mode: "amount" | "quantity";
}) {
  const response =
    mode === "amount"
      ? await findTopProductsByAmount(query)
      : await findTopProductsByQuantity(query);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {mode === "amount"
            ? "Productos mas vendidos por monto"
            : "Productos mas vendidos por cantidad"}
        </CardTitle>
        <CardDescription>
          Top 10 de productos cobrados en el periodo
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!response.success ? (
          <ModuleErrorState message={response.message} />
        ) : response.data.length === 0 ? (
          <EmptyState title="Aun no hay ventas en este periodo." />
        ) : (
          <div className="space-y-4">
            <TopProductsChartView data={response.data} mode={mode} />
            <ProductRows data={response.data} mode={mode} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
