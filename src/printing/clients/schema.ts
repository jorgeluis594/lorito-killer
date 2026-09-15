import { z } from "zod";

export const LinkPrintClientSchema = z.object({
  code: z.string().regex(/^\d{4}$/),
  machineName: z.string().trim().min(1).max(120),
});

export const PrinterInventorySchema = z.object({
  version: z.literal(1),
  printers: z
    .array(z.object({ localName: z.string().trim().min(1).max(260) }))
    .max(200),
});
