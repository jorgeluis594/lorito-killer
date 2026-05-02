"use client";

import { useEffect } from "react";
import { initializeRealtimeConnection } from "@/lib/realtime/connection-manager";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    initializeRealtimeConnection()
      .then((fn) => {
        cleanup = fn;
      })
      .catch((error) => {
        console.error("[Realtime] Failed to initialize connection:", error);
      });

    return () => {
      cleanup?.();
    };
  }, []);

  return <>{children}</>;
}
