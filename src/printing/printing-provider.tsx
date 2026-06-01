"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { getIminPrinterDebugInfo } from "@/printing/printers/imin/imin-sdk-wrapper";
import { initializePrintingRuntime } from "@/printing/printing-runtime";
import { notifyPrintingWarning } from "@/printing/printing-warning-toast";

export function PrintingProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void initializePrintingRuntime()
      .then((result) => {
        const iminHealth = result.printers.imin;
        if (iminHealth.ready) return;

        notifyPrintingWarning("Diagnostico iMin", {
          health: iminHealth,
          initializedAt: result.initializedAt,
          debug: getIminPrinterDebugInfo(),
        });
      })
      .catch((error) => {
        notifyPrintingWarning("Printing runtime initialization failed", {
          error,
          debug: getIminPrinterDebugInfo(),
        });
      });
  }, []);

  return children;
}
