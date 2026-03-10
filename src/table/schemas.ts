import { z } from "zod";

export const ZoneFormSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "El nombre no puede exceder 50 caracteres"),
  order: z.coerce.number().int().min(0).default(0),
});

export type ZoneFormValues = z.infer<typeof ZoneFormSchema>;

export const TableFormSchema = z.object({
  number: z.coerce
    .number()
    .int("El numero debe ser entero")
    .min(1, "El numero debe ser mayor a 0"),
  label: z.string().max(20, "La etiqueta no puede exceder 20 caracteres").optional().or(z.literal("")),
  capacity: z.coerce
    .number()
    .int("La capacidad debe ser un numero entero")
    .min(1, "La capacidad minima es 1")
    .max(20, "La capacidad maxima es 20"),
  zoneId: z.string().min(1, "La zona es requerida"),
});

export type TableFormValues = z.infer<typeof TableFormSchema>;

export const OpenTableSchema = z.object({
  tableId: z.string().uuid(),
  guestCount: z.coerce.number().int().min(1).optional(),
  notes: z.string().max(200).optional().or(z.literal("")),
});

export type OpenTableValues = z.infer<typeof OpenTableSchema>;
