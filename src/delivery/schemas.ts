import { z } from "zod";

/**
 * Forma de los datos de entrega recibidos del cliente. Las reglas (teléfono,
 * decimales, “paga con” contra el total) las aplica `validateDeliveryDetails`
 * en el servidor; aquí solo se acota el tipo de cada campo.
 */
export const DeliveryDetailsSchema = z.object({
  name: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(1000).optional(),
  reference: z.string().max(1000).nullish(),
  fee: z.union([z.number(), z.string().max(30)]).nullish(),
  expectedPaymentMethod: z.enum(["CASH", "WALLET"]).nullish(),
  cashPaysWith: z.union([z.number(), z.string().max(30)]).nullish(),
});

export type DeliveryDetailsFormInput = z.infer<typeof DeliveryDetailsSchema>;
