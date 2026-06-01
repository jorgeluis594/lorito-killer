"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { initializePrintingRuntime } from "@/printing/printing-runtime";

export function PrintingProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void initializePrintingRuntime().catch((error) => {
      console.warn("Printing runtime initialization failed", error);
    });
  }, []);

  return children;
}
