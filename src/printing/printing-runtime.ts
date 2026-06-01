"use client";

import { initPrinters } from "@/printing/init-printers";
import type { PrintersInitializationResult } from "@/printing/types";

export type PrintingRuntimeStatus = "initializing" | "ready" | "disabled";

type PrintingRuntimeState = {
  status: PrintingRuntimeStatus;
  result?: PrintersInitializationResult;
};

let runtimeState: PrintingRuntimeState = {
  status: "initializing",
};
let runtimePromise: Promise<PrintersInitializationResult> | undefined;

const statusFromResult = (
  result: PrintersInitializationResult,
): PrintingRuntimeStatus => (result.printers.imin.ready ? "ready" : "disabled");

export const initializePrintingRuntime =
  async (): Promise<PrintersInitializationResult> => {
    if (runtimeState.result?.printers.imin.ready) return runtimeState.result;
    if (runtimePromise) return runtimePromise;

    runtimeState = {
      ...runtimeState,
      status: "initializing",
    };

    runtimePromise = initPrinters()
      .then((result) => {
        runtimeState = {
          status: statusFromResult(result),
          result,
        };
        return result;
      })
      .catch(() => {
        const result: PrintersInitializationResult = {
          initializedAt: new Date().toISOString(),
          printers: {
            imin: {
              id: "imin",
              status: "unavailable",
              ready: false,
              reason: "plugin_unavailable",
              message: "No se pudo inicializar la impresora iMin.",
            },
          },
        };

        runtimeState = {
          status: "disabled",
          result,
        };
        return result;
      })
      .finally(() => {
        runtimePromise = undefined;
      });

    return runtimePromise;
  };

export const isFalconPrintingEnabled = (): boolean =>
  runtimeState.status === "ready";

export const waitForPrinterInitialization = async (): Promise<boolean> => {
  if (runtimeState.status === "ready") return true;

  try {
    const result = await initializePrintingRuntime();
    return result.printers.imin.ready;
  } catch {
    return false;
  }
};

export const getPrintingRuntimeState = (): PrintingRuntimeState => ({
  ...runtimeState,
});
