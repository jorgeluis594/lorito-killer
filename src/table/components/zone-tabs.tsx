"use client";

import type { Zone } from "../types";

interface ZoneTabsProps {
  zones: Zone[];
  selectedZoneId: string | null;
  onSelect: (zoneId: string | null) => void;
}

export function ZoneTabs({ zones, selectedZoneId, onSelect }: ZoneTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        onClick={() => onSelect(null)}
        className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          selectedZoneId === null
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
      >
        Todas
      </button>
      {zones.map((zone) => (
        <button
          key={zone.id}
          onClick={() => onSelect(zone.id)}
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            selectedZoneId === zone.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {zone.name}
        </button>
      ))}
    </div>
  );
}
