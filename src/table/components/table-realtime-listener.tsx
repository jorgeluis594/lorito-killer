"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRealtime } from "@/lib/realtime/hooks/use-realtime";

type TableEvents = {
  "table-draft-changed": { tableId: string };
  "table-session-changed": { tableId: string; sessionStatus: string };
  "table-waiter-changed": { tableId: string; newWaiterId: string };
  "table-round-added": { tableId: string; orderId: string; round: number };
  "order-item-taken": { orderItemId: string };
  "order-item-cancelled": { orderItemId: string };
  "kitchen-item-ready": { orderItemId: string };
  "kitchen-ticket-served": { tableId: string; round: number };
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
    const unsubDraft = realtime.on("table-draft-changed", debouncedOnEvent);
    const unsub1 = realtime.on("table-session-changed", () =>
      debouncedOnEvent(),
    );
    const unsub2 = realtime.on("table-waiter-changed", () =>
      debouncedOnEvent(),
    );
    const unsub3 = realtime.on("table-round-added", () => debouncedOnEvent());
    const unsub4 = realtime.on("order-item-taken", () => debouncedOnEvent());
    const unsub5 = realtime.on("order-item-cancelled", () =>
      debouncedOnEvent(),
    );
    const unsub6 = realtime.on("kitchen-item-ready", () => debouncedOnEvent());
    const unsub7 = realtime.on("kitchen-ticket-served", () =>
      debouncedOnEvent(),
    );

    return () => {
      unsubDraft();
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
    };
  }, [realtime, debouncedOnEvent]);

  return null;
}
