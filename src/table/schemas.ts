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
  tableId: z.string().min(1, "El ID de mesa es requerido"),
  guestCount: z.coerce.number().int().min(1).optional(),
  notes: z.string().max(200).optional().or(z.literal("")),
});

export type OpenTableValues = z.infer<typeof OpenTableSchema>;

// -- Server action validation schemas --

export const AddRoundSchema = z.object({
  tableId: z.string().min(1, "El ID de mesa es requerido"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "El ID de producto es requerido"),
        quantity: z.number().int().min(1, "La cantidad debe ser al menos 1"),
        notes: z.string().max(200).optional(),
      }),
    )
    .min(1, "Debes agregar al menos un producto"),
});

export const CloseTableSchema = z.object({
  tableId: z.string().min(1, "El ID de mesa es requerido"),
  cancelled: z.boolean().default(false),
});

export const RequestBillSchema = z.object({
  tableId: z.string().min(1, "El ID de mesa es requerido"),
});

export const TransferTableSchema = z.object({
  tableId: z.string().min(1, "El ID de mesa es requerido"),
  newWaiterId: z.string().min(1, "El ID de mozo es requerido"),
});

export const CreateZoneSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "El nombre no puede exceder 50 caracteres"),
  order: z.number().int().min(0).optional(),
});

export const UpdateZoneSchema = z.object({
  id: z.string().min(1, "El ID de zona es requerido"),
  data: z.object({
    name: z.string().min(1).max(50).optional(),
    order: z.number().int().min(0).optional(),
  }),
});

export const DeleteZoneSchema = z.object({
  id: z.string().min(1, "El ID de zona es requerido"),
});

export const CreateTableSchema = z.object({
  number: z.number().int().min(1, "El numero debe ser mayor a 0"),
  label: z.string().max(20).optional().or(z.literal("")),
  capacity: z.number().int().min(1).max(20),
  zoneId: z.string().min(1, "La zona es requerida"),
});

export const UpdateTableSchema = z.object({
  id: z.string().min(1, "El ID de mesa es requerido"),
  data: z.object({
    number: z.number().int().min(1).optional(),
    label: z.string().max(20).optional().or(z.literal("")),
    capacity: z.number().int().min(1).max(20).optional(),
    zoneId: z.string().min(1).optional(),
  }),
});

export const DeleteTableSchema = z.object({
  id: z.string().min(1, "El ID de mesa es requerido"),
});
