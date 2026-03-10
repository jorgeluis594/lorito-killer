"use client";

import { useEffect } from "react";
import { useRealtime } from "@/lib/realtime/hooks/use-realtime";

type TableEvents = {
  "table-session-changed": { tableId: string; sessionStatus: string };
  "table-waiter-changed": { tableId: string; newWaiterId: string };
  "table-round-added": { tableId: string; orderId: string; round: number };
};

interface TableRealtimeListenerProps {
  onEvent: () => void;
}

export function TableRealtimeListener({ onEvent }: TableRealtimeListenerProps) {
  const realtime = useRealtime<TableEvents>("tables");

  useEffect(() => {
    const unsub1 = realtime.on("table-session-changed", () => onEvent());
    const unsub2 = realtime.on("table-waiter-changed", () => onEvent());
    const unsub3 = realtime.on("table-round-added", () => onEvent());

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [realtime, onEvent]);

  return null;
}
