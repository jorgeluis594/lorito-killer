"use client";

import {
  iminSdkWrapper,
  messageForPrintFailure,
} from "@/printing/printers/imin/imin-sdk-wrapper";
import type {
  PrinterHealth,
  PrinterStatus,
  PrintersInitializationResult,
} from "@/printing/types";

let initializationResult: PrintersInitializationResult | undefined;
let initializationPromise: Promise<PrintersInitializationResult> | undefined;

const healthFromStatus = (status: PrinterStatus): PrinterHealth => ({
  id: "imin",
  status: status.ready ? "ready" : "error",
  ready: status.ready,
  reason: status.reason,
  message: status.message,
});

const unavailableHealth = (): PrinterHealth => ({
  id: "imin",
  status: "unavailable",
  ready: false,
  reason: "sdk_unavailable",
  message: messageForPrintFailure("sdk_unavailable"),
});

const initializeImin = async (): Promise<PrinterHealth> => {
  if (!iminSdkWrapper.isAvailable()) return unavailableHealth();

  const initStatus = await iminSdkWrapper.initialize();
  if (!initStatus.ready) return healthFromStatus(initStatus);

  const configStatus = await iminSdkWrapper.configure80mm();
  if (!configStatus.ready) return healthFromStatus(configStatus);

  return healthFromStatus(await iminSdkWrapper.getStatus());
};

export const initPrinters = async (): Promise<PrintersInitializationResult> => {
  if (initializationResult) return initializationResult;
  if (initializationPromise) return initializationPromise;

  initializationPromise = initializeImin()
    .then((imin) => {
      initializationResult = {
        initializedAt: new Date().toISOString(),
        printers: {
          imin,
        },
      };
      return initializationResult;
    })
    .finally(() => {
      initializationPromise = undefined;
    });

  return initializationPromise;
};

export const resetPrintersInitialization = () => {
  initializationResult = undefined;
  initializationPromise = undefined;
  iminSdkWrapper.resetConnection();
};
