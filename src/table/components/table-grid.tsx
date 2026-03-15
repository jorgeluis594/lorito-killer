"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Zone, TableWithSession } from "../types";
import { getTableDerivedStatus } from "../types";
import { TableCard } from "./table-card";
import { ZoneTabs } from "./zone-tabs";
import { TableActionsMenu } from "./table-actions-menu";
import { TableRealtimeListener } from "./table-realtime-listener";
import { Separator } from "@/shared/components/ui/separator";
import { openTable } from "../actions";
import { useToast } from "@/shared/components/ui/use-toast";

interface TableGridProps {
  tables: TableWithSession[];
  zones: Zone[];
  waiters: Array<{ id: string; name: string | null }>;
  subdomain: string;
}

function SummaryBar({ tables }: { tables: TableWithSession[] }) {
  const counts = useMemo(() => {
    let occupied = 0;
    let billRequested = 0;
    let available = 0;
    for (const t of tables) {
      const s = getTableDerivedStatus(t);
      if (s === "OCCUPIED") occupied++;
      else if (s === "BILL_REQUESTED") billRequested++;
      else available++;
    }
    return { occupied, billRequested, available, total: tables.length };
  }, [tables]);

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3 text-sm max-sm:grid max-sm:grid-cols-3 max-sm:gap-2">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400">
          {counts.occupied}
        </span>
        <span className="text-muted-foreground">
          /{counts.total} Ocupadas
        </span>
      </div>
      <Separator orientation="vertical" className="h-6 max-sm:hidden" />
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
          {counts.billRequested}
        </span>
        <span className="text-muted-foreground">
          Cuenta pedida
        </span>
      </div>
      <Separator orientation="vertical" className="h-6 max-sm:hidden" />
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          {counts.available}
        </span>
        <span className="text-muted-foreground">
          Libres
        </span>
      </div>
    </div>
  );
}

export function TableGrid({ tables: initialTables, zones, waiters, subdomain }: TableGridProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableWithSession | null>(null);
  const [tables, setTables] = useState(initialTables);
  const [openingTableIds, setOpeningTableIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  const filteredTables = useMemo(
    () => selectedZoneId ? tables.filter((t) => t.zoneId === selectedZoneId) : tables,
    [tables, selectedZoneId]
  );

  const handleTableClick = useCallback(async (table: TableWithSession) => {
    const status = getTableDerivedStatus(table);

    if (status === "AVAILABLE") {
      // One-tap open: call openTable directly
      setOpeningTableIds((prev) => new Set(prev).add(table.id));
      try {
        const result = await openTable(table.id);
        if (result.success) {
          toast({ title: `Mesa ${table.label || table.number} abierta`, duration: 2000 });
          router.refresh();
        } else {
          toast({ title: "Error", description: result.message, variant: "destructive", duration: 5000 });
        }
      } catch {
        toast({ title: "Error", description: "No se pudo abrir la mesa", variant: "destructive", duration: 5000 });
      } finally {
        setOpeningTableIds((prev) => {
          const next = new Set(prev);
          next.delete(table.id);
          return next;
        });
      }
    } else {
      // OCCUPIED or BILL_REQUESTED: open the sheet
      setSelectedTable(table);
    }
  }, [router, toast]);

  const handleCloseMenu = useCallback(() => {
    setSelectedTable(null);
  }, []);

  const handleRefresh = useCallback(() => {
    router.refresh();
    setSelectedTable(null);
  }, [router]);

  return (
    <>
      <TableRealtimeListener onEvent={handleRefresh} />
      <div className="space-y-4">
        <SummaryBar tables={tables} />

        {zones.length > 1 && (
          <ZoneTabs
            zones={zones}
            tables={tables}
            selectedZoneId={selectedZoneId}
            onSelect={setSelectedZoneId}
          />
        )}

        {filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              {zones.length === 0
                ? "No hay zonas configuradas. Ve a Configuracion para crear zonas y mesas."
                : "No hay mesas en esta zona."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onClick={handleTableClick}
                isOpening={openingTableIds.has(table.id)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedTable && (
        <TableActionsMenu
          table={selectedTable}
          waiters={waiters}
          open={!!selectedTable}
          onClose={handleCloseMenu}
          onAction={handleRefresh}
        />
      )}
    </>
  );
}
