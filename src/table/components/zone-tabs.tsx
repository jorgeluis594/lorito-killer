"use client";

import { cn } from "@/lib/utils";
import type { Zone, TableWithSession } from "../types";
import { getTableDerivedStatus } from "../types";

interface ZoneTabsProps {
  zones: Zone[];
  tables: TableWithSession[];
  selectedZoneId: string | null;
  onSelect: (zoneId: string | null) => void;
}

function getZoneCounts(tables: TableWithSession[], zoneId: string | null) {
  const zoneTables = zoneId ? tables.filter((t) => t.zoneId === zoneId) : tables;
  const occupied = zoneTables.filter((t) => {
    const s = getTableDerivedStatus(t);
    return s === "OCCUPIED" || s === "BILL_REQUESTED";
  }).length;
  return { occupied, total: zoneTables.length };
}

export function ZoneTabs({ zones, tables, selectedZoneId, onSelect }: ZoneTabsProps) {
  const allCounts = getZoneCounts(tables, null);

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
        Todas ({allCounts.occupied}/{allCounts.total})
      </button>
      {zones.map((zone) => {
        const counts = getZoneCounts(tables, zone.id);
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
            {zone.name} ({counts.occupied}/{counts.total})
          </button>
        );
      })}
    </div>
  );
}
