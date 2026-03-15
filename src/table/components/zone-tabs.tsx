"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Zone, TableWithSession } from "../types";
import { getTableDerivedStatus } from "../types";

interface ZoneTabsProps {
  zones: Zone[];
  tables: TableWithSession[];
  selectedZoneId: string | null;
  onSelect: (zoneId: string | null) => void;
}

export function ZoneTabs({ zones, tables, selectedZoneId, onSelect }: ZoneTabsProps) {
  const zoneCounts = useMemo(() => {
    const counts = new Map<string | null, { occupied: number; total: number }>();
    let allOccupied = 0;
    for (const t of tables) {
      const s = getTableDerivedStatus(t);
      const isOccupied = s === "OCCUPIED" || s === "BILL_REQUESTED";
      if (isOccupied) allOccupied++;
      const existing = counts.get(t.zoneId) ?? { occupied: 0, total: 0 };
      counts.set(t.zoneId, {
        occupied: existing.occupied + (isOccupied ? 1 : 0),
        total: existing.total + 1,
      });
    }
    counts.set(null, { occupied: allOccupied, total: tables.length });
    return counts;
  }, [tables]);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "whitespace-nowrap rounded-full min-h-[44px] px-5 py-2.5 text-sm font-medium transition-colors",
          selectedZoneId === null
            ? "bg-background text-foreground shadow-sm border"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
        )}
      >
        Todas ({zoneCounts.get(null)?.occupied ?? 0}/{zoneCounts.get(null)?.total ?? 0})
      </button>
      {zones.map((zone) => {
        const counts = zoneCounts.get(zone.id);
        return (
          <button
            key={zone.id}
            onClick={() => onSelect(zone.id)}
            className={cn(
              "whitespace-nowrap rounded-full min-h-[44px] px-5 py-2.5 text-sm font-medium transition-colors",
              selectedZoneId === zone.id
                ? "bg-background text-foreground shadow-sm border"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {zone.name} ({counts?.occupied ?? 0}/{counts?.total ?? 0})
          </button>
        );
      })}
    </div>
  );
}
