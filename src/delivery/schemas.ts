import { z } from "zod";

/**
 * Forma de los datos de entrega recibidos del cliente. Las reglas (teléfono,
 * decimales) las aplica `validateDeliveryDetails` en el servidor; aquí solo se
 * acota el tipo de cada campo.
 */
export const DeliveryDetailsSchema = z.object({
  name: z.string().max(500).nullish(),
  phone: z.string().max(50).optional(),
  address: z.string().max(1000).optional(),
  reference: z.string().max(1000).nullish(),
  fee: z.union([z.number(), z.string().max(30)]).nullish(),
});

export type DeliveryDetailsFormInput = z.infer<typeof DeliveryDetailsSchema>;

export const UpdateDeliveryDetailsSchema = DeliveryDetailsSchema.extend({
  orderId: z.string().uuid(),
  /** Versión (`Order.updatedAt`) con la que se abrió el formulario. */
  updatedAt: z.string().datetime(),
});

export type UpdateDeliveryDetailsInput = z.infer<
  typeof UpdateDeliveryDetailsSchema
>;

export const OrderIdSchema = z.object({ orderId: z.string().uuid() });
