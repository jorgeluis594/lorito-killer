import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import type { DashboardQuery } from "@/dashboard/types";
import { findPaymentBreakdown } from "@/dashboard/db_repository";
import { ModuleErrorState } from "@/dashboard/components/module-error-state";
import { EmptyState } from "@/dashboard/components/empty-state";
import { PaymentMethodChart as PaymentMethodChartView } from "@/dashboard/components/dashboard-charts";
import { formatDashboardCurrency } from "@/dashboard/components/formatters";

export async function PaymentMethodChart({ query }: { query: DashboardQuery }) {
  const response = await findPaymentBreakdown(query);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ventas por medio de pago</CardTitle>
        <CardDescription>Monto cobrado y participacion del total</CardDescription>
      </CardHeader>
      <CardContent>
        {!response.success ? (
          <ModuleErrorState message={response.message} />
        ) : response.data.length === 0 ? (
          <EmptyState title="Sin pagos cobrados en este periodo." />
        ) : (
          <div className="space-y-4">
            <PaymentMethodChartView data={response.data} />
            <div className="space-y-2">
              {response.data.map((payment) => (
                <Link
                  key={payment.method}
                  href={payment.href}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                >
                  <span>{payment.label}</span>
                  <span className="font-medium">
                    {formatDashboardCurrency(payment.total)} · {payment.percentage.toFixed(1)}%
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
