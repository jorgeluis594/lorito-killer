import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import type {
  SellerPerformanceReport,
  SellerPerformanceRow,
} from "@/sale_report/types";
import {
  copyReportSearchParams,
  type ReportSearchParams,
} from "@/sale_report/search-params";
import SellerKpiSummary from "@/sale_report/components/sellers/seller-kpi-summary";
import SellerPerformanceTable from "@/sale_report/components/sellers/seller-performance-table";
import SellerRankingBars from "@/sale_report/components/sellers/seller-ranking-bars";

type SellerReportViewProps = {
  report: SellerPerformanceReport;
  searchParams: ReportSearchParams;
};

export default function SellerReportView({
  report,
  searchParams,
}: SellerReportViewProps) {
  const salesHrefFor = (row: SellerPerformanceRow) => {
    const params = copyReportSearchParams(searchParams);
    params.delete("page");
    params.set("status", report.query.status);

    if (row.sellerId) {
      params.set("sellerMode", "specific");
      params.set("sellerId", row.sellerId);
    } else {
      params.set("sellerMode", "unassigned");
      params.delete("sellerId");
    }

    const queryString = params.toString();
    return queryString
      ? `/dashboard/sales_reports?${queryString}`
      : "/dashboard/sales_reports";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-normal">
            Reporte de vendedores
          </h1>
          <p className="text-sm text-muted-foreground">
            Ventas atribuidas por vendedor en el periodo seleccionado
          </p>
        </div>
        {report.rows.length === 0 && (
          <Button asChild variant="outline">
            <Link href="/dashboard/sales_reports/sellers">Limpiar filtros</Link>
          </Button>
        )}
      </div>

      <SellerKpiSummary kpis={report.kpis} />
      <SellerRankingBars rows={report.ranking} />
      <SellerPerformanceTable
        rows={report.rows}
        salesHrefFor={salesHrefFor}
      />
    </div>
  );
}
