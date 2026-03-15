"use client";

import { useEffect, useRef, useCallback } from "react";
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedOnEvent = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onEvent();
    }, 1500);
  }, [onEvent]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const unsub1 = realtime.on("table-session-changed", () => debouncedOnEvent());
    const unsub2 = realtime.on("table-waiter-changed", () => debouncedOnEvent());
    const unsub3 = realtime.on("table-round-added", () => debouncedOnEvent());

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [realtime, debouncedOnEvent]);

  return null;
}
