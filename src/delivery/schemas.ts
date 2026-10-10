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
  // El formulario usa "" para “Sin definir”: equivale a no informar medio.
  expectedPaymentMethod: z.preprocess(
    (value) => (value === "" ? null : value),
    z.enum(["CASH", "WALLET"]).nullish(),
  ),
  cashPaysWith: z.union([z.number(), z.string().max(30)]).nullish(),
});

export type DeliveryDetailsFormInput = z.infer<typeof DeliveryDetailsSchema>;

export const UpdateDeliveryDetailsSchema = DeliveryDetailsSchema.extend({
  orderId: z.string().uuid(),
  /** Versión (`Order.updatedAt`) con la que se cargó la pantalla. */
  updatedAt: z.string().datetime(),
});

export type UpdateDeliveryDetailsInput = z.infer<
  typeof UpdateDeliveryDetailsSchema
>;

export const DELIVERY_LIST_PAGE_SIZE = 20;

export const DeliveryListFiltersSchema = z.object({
  /** Día (YYYY-MM-DD, hora de Lima); por defecto hoy. */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** Sin estado: Pendientes y Despachados. */
  status: z.enum(["PENDING", "DISPATCHED", "DELIVERED"]).optional(),
  search: z.string().trim().max(120).optional(),
  cursor: z.string().uuid().optional(),
});

export type DeliveryListFilters = z.infer<typeof DeliveryListFiltersSchema>;
