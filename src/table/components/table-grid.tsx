"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Zone, TableWithSession } from "../types";
import { TableCard } from "./table-card";
import { ZoneTabs } from "./zone-tabs";
import { TableActionsMenu } from "./table-actions-menu";
import { TableRealtimeListener } from "./table-realtime-listener";

interface TableGridProps {
  tables: TableWithSession[];
  zones: Zone[];
  waiters: Array<{ id: string; name: string | null }>;
  subdomain: string;
}

export function TableGrid({ tables: initialTables, zones, waiters, subdomain }: TableGridProps) {
  const router = useRouter();
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableWithSession | null>(null);
  const [tables, setTables] = useState(initialTables);

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  const filteredTables = selectedZoneId
    ? tables.filter((t) => t.zoneId === selectedZoneId)
    : tables;

  const handleTableClick = useCallback((table: TableWithSession) => {
    setSelectedTable(table);
  }, []);

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
        {zones.length > 1 && (
          <ZoneTabs
            zones={zones}
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onClick={handleTableClick}
              />
            ))}
          </div>
        )}
      </div>

      {selectedTable && (
        <TableActionsMenu
          table={selectedTable}
          waiters={waiters}
          subdomain={subdomain}
          open={!!selectedTable}
          onClose={handleCloseMenu}
          onAction={handleRefresh}
        />
      )}
    </>
  );
}
