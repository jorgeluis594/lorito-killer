import { z } from "zod";

export const CancelRoundItemSchema = z.object({
  cancellationId: z.string().uuid("La cancelación no es válida"),
  orderRoundItemId: z.string().uuid("El plato no es válido"),
  quantity: z.number().positive("La cantidad debe ser mayor a cero"),
  reason: z
    .string()
    .trim()
    .max(500, "El motivo no puede exceder 500 caracteres")
    .optional(),
});

export type CancelRoundItemInput = z.infer<typeof CancelRoundItemSchema>;
