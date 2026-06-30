import { formatPrice } from "@/lib/utils";
import type { SellerPerformanceRow } from "@/sale_report/types";

type SellerRankingBarsProps = {
  rows: SellerPerformanceRow[];
};

export default function SellerRankingBars({ rows }: SellerRankingBarsProps) {
  if (rows.length === 0) {
    return (
      <section className="rounded-md border p-6">
        <h2 className="text-lg font-semibold">Ranking de vendedores</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          No hay ventas para los filtros seleccionados.
        </p>
      </section>
    );
  }

  const maxSold = Math.max(...rows.map((row) => row.totalSold), 1);

  return (
    <section className="rounded-md border p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">Ranking de vendedores</h2>
        <p className="text-sm text-muted-foreground">
          Top vendedores por monto vendido
        </p>
      </div>
      <div className="space-y-4">
        {rows.map((row, index) => {
          const width = `${Math.max((row.totalSold / maxSold) * 100, 4)}%`;

          return (
            <div key={row.sellerId ?? "unassigned"} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="truncate font-medium">{row.sellerName}</span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-semibold">{formatPrice(row.totalSold)}</span>
                  <span className="ml-2 text-muted-foreground">
                    {row.participationPercent}%
                  </span>
                </div>
              </div>
              <div className="h-3 rounded-full bg-muted">
                <div
                  className="h-3 rounded-full bg-emerald-600"
                  style={{ width }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
