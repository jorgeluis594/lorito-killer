"use client";

import { useEffect } from "react";
import { useRealtime } from "@/lib/realtime/hooks/use-realtime";
import { useToast } from "@/shared/components/ui/use-toast";

type PrintUserEvents = {
  "print-job-failed": { jobId: string; sourceType: string; message: string };
};

export function PrintJobFailureListener({ userId }: { userId: string }) {
  const realtime = useRealtime<PrintUserEvents>(`print-user-${userId}`);
  const { toast } = useToast();

  useEffect(
    () =>
      realtime.on("print-job-failed", ({ message, sourceType }) =>
        toast({
          title:
            sourceType === "PRE_BILL"
              ? "No se pudo imprimir la precuenta"
              : "No se pudo imprimir el comprobante",
          description: message,
          variant: "destructive",
        }),
      ),
    [realtime, toast],
  );

  return null;
}
