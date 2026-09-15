import { z } from "zod";

export const ManualKitchenTicketPrintSchema = z.object({
  kitchenTicketId: z.string().uuid(),
  jobId: z.string().uuid(),
});

export const KitchenTicketOrderSchema = z.string().uuid();

export const KitchenInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Ingresa un nombre").max(80),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  printerId: z.string().uuid().nullable().optional(),
});
