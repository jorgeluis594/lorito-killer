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

export const UpdatePrinterSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  paperWidth: z.enum(["MM58", "MM80"]),
  columns: z.coerce.number().int().positive(),
  codepageMapping: z.literal("epson"),
  cutEnabled: z.boolean(),
  feedBeforeCut: z.coerce.number().int().nonnegative(),
});

export const PrintJobResultSchema = z.object({
  attemptNumber: z.number().int().positive(),
  result: z.enum(["DELIVERED", "RETRYABLE_FAILURE", "FAILED"]),
  error: z.string().trim().max(1000).optional(),
});
