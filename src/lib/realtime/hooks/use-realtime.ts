"use client";

import { useCompany } from "@/lib/use-company";
import { getOrCreateManager } from "../realtime-registry";

type EventMap = Record<string, unknown>;

export function useRealtime<TEvents extends EventMap>(feature: string) {
  const company = useCompany();

  function on<K extends keyof TEvents & string>(
    event: K,
    handler: (data: TEvents[K]) => void,
  ): () => void {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    getOrCreateManager<TEvents[K]>(company.id, feature, event).then(
      (manager) => {
        if (!cancelled) {
          cleanup = manager.addListener(handler);
        }
      },
    );

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }

  return { on };
}
