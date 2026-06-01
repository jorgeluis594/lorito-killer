"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { initializePrintingRuntime } from "@/printing/printing-runtime";
import { notifyPrintingWarning } from "@/printing/printing-warning-toast";

export function PrintingProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void initializePrintingRuntime().catch((error) => {
      notifyPrintingWarning("Printing runtime initialization failed", error);
    });
  }, []);

  return children;
}
