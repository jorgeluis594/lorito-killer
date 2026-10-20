import { taxDocumentPrintStrategy } from "@/document/print-strategy";
import { kitchenTicketPrintStrategy } from "@/kitchen/print-strategy";
import { preBillPrintStrategy } from "@/table/print-strategy";
import type { PrintJobSourceType, PrintJobStrategy } from "./types";

export const printJobStrategies = {
  KITCHEN_TICKET: kitchenTicketPrintStrategy,
  TAX_DOCUMENT: taxDocumentPrintStrategy,
  PRE_BILL: preBillPrintStrategy,
} satisfies Record<PrintJobSourceType, PrintJobStrategy<any>>;

export const getPrintJobStrategy = (
  sourceType: PrintJobSourceType,
): PrintJobStrategy<any> => printJobStrategies[sourceType];
