import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { DashboardQuery, RecentSaleRow } from "@/dashboard/types";
import {
  findRecentSales,
  orderStatusLabel,
} from "@/dashboard/db_repository";
import { ModuleErrorState } from "@/dashboard/components/module-error-state";
import { EmptyState } from "@/dashboard/components/empty-state";
import {
  formatDashboardCurrency,
  formatDashboardTime,
} from "@/dashboard/components/formatters";

const badgeVariant: Record<RecentSaleRow["status"], "default" | "secondary" | "destructive"> = {
  completed: "default",
  cancelled: "destructive",
  pending: "secondary",
};

export async function RecentSalesList({ query }: { query: DashboardQuery }) {
  const response = await findRecentSales(query);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ultimas ventas</CardTitle>
        <CardDescription>Actividad reciente del periodo</CardDescription>
      </CardHeader>
      <CardContent>
        {!response.success ? (
          <ModuleErrorState message={response.message} />
        ) : response.data.length === 0 ? (
          <EmptyState title="Aun no hay ventas en este periodo." />
        ) : (
          <div className="space-y-2">
            {response.data.map((sale) => (
              <Link
                key={sale.orderId}
                href={sale.href}
                className="block rounded-md border px-3 py-3 transition-colors hover:bg-muted/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {formatDashboardCurrency(sale.amount)}
                      </p>
                      <Badge variant={badgeVariant[sale.status]}>
                        {orderStatusLabel(sale.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {sale.documentLabel} · {sale.sellerName}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {sale.paymentMethods}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {formatDashboardTime(sale.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
