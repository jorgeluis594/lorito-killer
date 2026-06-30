import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import type { DashboardQuery } from "@/dashboard/types";
import { findSalesTrend } from "@/dashboard/db_repository";
import { ModuleErrorState } from "@/dashboard/components/module-error-state";
import { EmptyState } from "@/dashboard/components/empty-state";
import { SalesTrendChart as SalesTrendChartView } from "@/dashboard/components/dashboard-charts";

export async function SalesTrendChart({ query }: { query: DashboardQuery }) {
  const response = await findSalesTrend(query);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evolucion de ventas cobradas</CardTitle>
        <CardDescription>Monto y cantidad por {query.bucket === "hour" ? "hora" : "dia"}</CardDescription>
      </CardHeader>
      <CardContent>
        {!response.success ? (
          <ModuleErrorState message={response.message} />
        ) : response.data.every((point) => point.total === 0 && point.count === 0) ? (
          <EmptyState
            title="Aun no hay ventas en este periodo."
            description="Cambia el periodo o crea una nueva venta para ver actividad."
          />
        ) : (
          <>
            <SalesTrendChartView data={response.data} />
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {response.data
                .filter((point) => point.count > 0)
                .slice(0, 6)
                .map((point) => (
                  <Link key={point.key} href={point.href} className="underline-offset-4 hover:underline">
                    {point.label}
                  </Link>
                ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
