import type { response } from "@/lib/types";
import type { PrinterProfile } from "../types";

export const updatePrinter = (
  save: (
    companyId: string,
    input: PrinterProfile,
  ) => Promise<response<PrinterProfile>>,
  companyId: string,
  input: PrinterProfile,
) => save(companyId, input);
