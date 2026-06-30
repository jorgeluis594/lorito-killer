import Link from "next/link";
import { Banknote, Calculator, ReceiptText, WalletCards } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { DashboardKpis, DashboardQuery } from "@/dashboard/types";
import { findDashboardKpis } from "@/dashboard/db_repository";
import { ModuleErrorState } from "@/dashboard/components/module-error-state";
import { formatDashboardCurrency } from "@/dashboard/components/formatters";

const cashStatusLabel: Record<DashboardKpis["cash"]["status"], string> = {
  open: "Abierta",
  closed: "Cerrada",
  mixed: "Mixta",
  none: "Sin caja",
};

function KpiCard({
  title,
  description,
  value,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  value: string;
  href: string;
  icon: typeof ReceiptText;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function KpiSummaryView({
  data,
  query,
}: {
  data: DashboardKpis;
  query: DashboardQuery;
}) {
  const reportHref = `/dashboard/sales_reports?start=${encodeURIComponent(
    query.startDate.toISOString(),
  )}&end=${encodeURIComponent(query.endDate.toISOString())}&status=paid`;
  const cashHref = data.cash.cashShiftId
    ? `/dashboard/cash_shifts/${data.cash.cashShiftId}/reports`
    : "/dashboard/cash_shifts";
  const cashValue =
    data.cash.status === "closed" && data.cash.difference !== undefined
      ? formatDashboardCurrency(data.cash.difference)
      : formatDashboardCurrency(data.cash.expectedCash);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Ventas cobradas"
        description="Ordenes completadas del periodo"
        value={formatDashboardCurrency(data.paidSalesTotal)}
        href={reportHref}
        icon={Banknote}
      />
      <KpiCard
        title="Numero de ventas"
        description="Tickets cobrados, sin anulaciones"
        value={String(data.paidSalesCount)}
        href={reportHref}
        icon={ReceiptText}
      />
      <KpiCard
        title="Ticket promedio"
        description="Ventas cobradas entre tickets"
        value={formatDashboardCurrency(data.averageTicket)}
        href={reportHref}
        icon={Calculator}
      />
      <Link href={cashHref}>
        <Card className="h-full transition-colors hover:bg-muted/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de caja</CardTitle>
            <WalletCards className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{cashValue}</div>
              <Badge variant="outline">{cashStatusLabel[data.cash.status]}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.cash.status === "closed"
                ? "Diferencia de caja cerrada"
                : "Efectivo esperado"}
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

export async function KpiSummary({ query }: { query: DashboardQuery }) {
  const response = await findDashboardKpis(query);
  if (!response.success) return <ModuleErrorState message={response.message} />;

  return <KpiSummaryView data={response.data} query={query} />;
}
