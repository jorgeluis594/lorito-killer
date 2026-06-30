import { CircleDollarSign, ReceiptText, Ticket, Trophy, Users } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { SellerPerformanceReport } from "@/sale_report/types";

type SellerKpiSummaryProps = {
  kpis: SellerPerformanceReport["kpis"];
};

const kpiClassName =
  "rounded-md border bg-card p-4 text-card-foreground shadow-sm";

export default function SellerKpiSummary({ kpis }: SellerKpiSummaryProps) {
  const items = [
    {
      label: "Total vendido",
      value: formatPrice(kpis.totalSold),
      icon: CircleDollarSign,
    },
    {
      label: "Ventas",
      value: kpis.salesCount.toString(),
      icon: ReceiptText,
    },
    {
      label: "Ticket promedio",
      value: formatPrice(kpis.averageTicket),
      icon: Ticket,
    },
    {
      label: "Vendedores con ventas",
      value: kpis.sellersWithSales.toString(),
      icon: Users,
    },
    {
      label: "Top vendedor",
      value: kpis.topSeller?.sellerName ?? "Sin ventas",
      icon: Trophy,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div key={item.label} className={kpiClassName}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">
                {item.label}
              </p>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="break-words text-2xl font-bold tracking-normal">
              {item.value}
            </p>
          </div>
        );
      })}
    </section>
  );
}
