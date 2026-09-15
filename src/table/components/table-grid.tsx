"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";
import type { Zone, TableWithSession } from "../types";
import { ZoneTabs } from "./zone-tabs";
import { TableRealtimeListener } from "./table-realtime-listener";
import { openTable } from "../actions";
import { formatPrice } from "@/lib/utils";

export function TableGrid({
  tables,
  zones,
  canAttend = true,
}: {
  tables: TableWithSession[];
  zones: Zone[];
  canAttend?: boolean;
}) {
  const router = useRouter();
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState("");
  const openingRef = useRef(false);
  const refresh = useCallback(() => router.refresh(), [router]);
  const visible = tables
    .filter((table) => !zoneId || table.zoneId === zoneId)
    .sort((a, b) => a.number - b.number);
  const occupied = visible.filter((table) => table.activeSession);
  const available = visible.filter((table) => !table.activeSession);

  async function attend(table: TableWithSession) {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(table.id);
    setError("");
    try {
      if (!table.activeSession) {
        const result = await openTable(table.id);
        if (!result.success) {
          setError(result.message);
          router.refresh();
          return;
        }
      }
      router.push(
        table.activeSession?.status === "BILL_REQUESTED"
          ? `/dashboard/tables/${table.id}/payment?session=${table.activeSession.id}`
          : `/dashboard/tables/${table.id}/order`,
      );
    } catch {
      setError("No se pudo abrir la mesa. Vuelve a intentarlo.");
    } finally {
      openingRef.current = false;
      setOpening(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <TableRealtimeListener onEvent={refresh} />
      {zones.length > 1 ? (
        <ZoneTabs
          zones={zones}
          tables={tables}
          selectedZoneId={zoneId}
          onSelect={setZoneId}
        />
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      <section
        aria-labelledby="occupied-tables"
        className="flex flex-col gap-3"
      >
        <h2 id="occupied-tables" className="text-lg font-bold">
          En atención{" "}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {occupied.length}
          </span>
        </h2>
        {occupied.length ? (
          <div className="flex flex-col gap-3">
            {occupied.map((table) => {
              const session = table.activeSession!;
              const total =
                (session.order?.orderItems ?? [])
                  .filter((item) => item.kitchenStatus !== "CANCELLED")
                  .reduce(
                    (sum, item) => sum + Math.round(item.total * 100),
                    0,
                  ) / 100;
              const draftCount =
                session.draft?.reduce((sum, item) => sum + item.quantity, 0) ??
                0;
              return (
                <button
                  key={table.id}
                  onClick={() => attend(table)}
                  disabled={!!opening}
                  aria-label={`Atender mesa ${table.label || table.number}, número ${table.number}, ${session.status === "BILL_REQUESTED" ? "cuenta pedida" : "en atención"}, ${formatPrice(total)}${draftCount ? `, pedido sin enviar: ${draftCount} productos` : ""}`}
                  className="flex min-h-28 w-full items-center gap-4 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:gap-6 sm:p-5"
                >
                  <span className="min-w-10 text-center text-3xl font-bold tabular-nums">
                    {table.number}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    {table.label ? (
                      <span className="font-bold break-words">
                        {table.label}
                      </span>
                    ) : null}
                    <span className="text-sm">
                      {session.status === "BILL_REQUESTED"
                        ? "Pendiente de cobro en caja"
                        : "En atención"}
                    </span>
                    {draftCount ? (
                      <span className="w-fit rounded-md bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground">
                        Pedido sin enviar · {draftCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-base font-bold tabular-nums sm:text-xl">
                      {formatPrice(total)}
                    </span>
                    {opening === table.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <ChevronRight
                        className="size-4 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Todo listo. Toca una mesa libre para tomar el primer pedido.
          </p>
        )}
      </section>
      <section aria-labelledby="free-tables" className="flex flex-col gap-3">
        <h2 id="free-tables" className="text-lg font-bold">
          Libres{" "}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {available.length}
          </span>
        </h2>
        {available.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {available.map((table) => (
              <button
                key={table.id}
                onClick={() => attend(table)}
                disabled={!!opening || !canAttend}
                aria-label={`Atender mesa ${table.label || table.number}, libre`}
                className="flex min-h-28 items-center justify-between gap-3 rounded-xl border bg-card p-5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-2xl font-bold tabular-nums">
                    {table.number}
                  </span>
                  {table.label ? (
                    <span className="text-sm break-words">{table.label}</span>
                  ) : null}
                  <span className="text-sm text-muted-foreground">Libre</span>
                </span>
                {opening === table.id ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <ChevronRight
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Todas las mesas están en atención.
          </p>
        )}
      </section>
    </div>
  );
}
