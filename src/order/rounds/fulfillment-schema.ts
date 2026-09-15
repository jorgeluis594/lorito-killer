import { z } from "zod";

export const FulfillmentRoundSchema = z.object({
  orderId: z.string().uuid().optional(),
  roundId: z.string().uuid("El envío no es válido"),
  orderType: z.enum(["TAKE_AWAY", "DELIVERY"]),
  items: z
    .array(
      z.object({
        productId: z.string().uuid("El producto no es válido"),
        quantity: z.number().positive("La cantidad debe ser mayor a cero"),
        notes: z.string().trim().max(500).optional(),
      }),
    )
    .min(1, "Agrega al menos un producto"),
});

export const FulfillmentOrderIdSchema = z.object({
  orderId: z.string().uuid("El pedido no es válido"),
});

export type FulfillmentRoundInput = z.infer<typeof FulfillmentRoundSchema>;
