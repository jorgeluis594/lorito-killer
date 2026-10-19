import { kitchenTicketPrintStrategy } from "@/kitchen/print-strategy";
import type { PrintJobSourceType, PrintJobStrategy } from "./types";

// shortcut: TAX_DOCUMENT y PRE_BILL se agregan en las tareas 2 y 3
export const printJobStrategies: Partial<
  Record<PrintJobSourceType, PrintJobStrategy<any>>
> = {
  KITCHEN_TICKET: kitchenTicketPrintStrategy,
};

export function getPrintJobStrategy(sourceType: PrintJobSourceType) {
  const strategy = printJobStrategies[sourceType];
  if (!strategy)
    throw new Error(`No hay estrategia de impresión para ${sourceType}`);
  return strategy;
}
