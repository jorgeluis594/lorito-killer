import Link from "next/link";
import { ArrowLeft, PackageCheck } from "lucide-react";
import { requirePermission } from "@/authorization/server";
import { listDeliveredToday } from "@/delivery/db_repository";
import { Button } from "@/shared/components/ui/button";
import { formatLimaTime } from "@/delivery/use-cases/describe-service-order";
import { formatPrice } from "@/lib/utils";

export default async function DeliveredTodayPage() {
  const auth = await requirePermission("tables", "read");
  const result = auth.success
    ? await listDeliveredToday(auth.data.companyId)
    : auth;
  const total = result.success
    ? result.data.reduce((sum, item) => sum + Math.round(item.total * 100), 0) /
      100
    : 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/tables" aria-label="Volver a mesas">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Entregados hoy</h1>
          <p className="text-sm text-muted-foreground">
            Delivery y para llevar cerrados. Los reportes tienen el detalle por
            fecha.
          </p>
        </div>
      </header>
      {!result.success ? (
        <p role="alert" className="text-destructive">
          {result.message}
        </p>
      ) : result.data.length ? (
        <section aria-label="Pedidos entregados hoy">
          <div className="flex items-baseline justify-between border-b pb-3">
            <p className="text-sm text-muted-foreground">
              {result.data.length}{" "}
              {result.data.length === 1 ? "pedido" : "pedidos"}
            </p>
            <p className="font-bold tabular-nums">{formatPrice(total)}</p>
          </div>
          <ul className="divide-y">
            {result.data.map((item) => (
              <li key={item.sessionId} className="flex items-start gap-4 py-4">
                <span className="w-20 shrink-0 whitespace-nowrap pt-0.5 text-sm tabular-nums text-muted-foreground">
                  {formatLimaTime(item.closedAt)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold break-words">{item.title}</p>
                  {item.address ? (
                    <p className="text-sm text-muted-foreground break-words">
                      {item.address}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 tabular-nums">
                  {formatPrice(item.total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
          <PackageCheck className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Todavía no se cerró ningún pedido hoy. Un delivery se cierra al
            quedar entregado y cobrado; uno para llevar, al entregarlo.
          </p>
        </div>
      )}
    </main>
  );
}
