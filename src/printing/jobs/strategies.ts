import { taxDocumentPrintStrategy } from "@/document/print-strategy";
import { kitchenTicketPrintStrategy } from "@/kitchen/print-strategy";
import type { PrintJobSourceType, PrintJobStrategy } from "./types";

// shortcut: PRE_BILL se agrega en la tarea 3
export const printJobStrategies: Partial<
  Record<PrintJobSourceType, PrintJobStrategy<any>>
> = {
  KITCHEN_TICKET: kitchenTicketPrintStrategy,
  TAX_DOCUMENT: taxDocumentPrintStrategy,
};

export function getPrintJobStrategy(sourceType: PrintJobSourceType) {
  const strategy = printJobStrategies[sourceType];
  if (!strategy)
    throw new Error(`No hay estrategia de impresión para ${sourceType}`);
  return strategy;
}
