import * as z from "zod";

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const optionalTrimmedString = z.preprocess(
  emptyToUndefined,
  z.string().optional(),
);

const requiredTrimmedString = (message: string) =>
  z.string().trim().min(1, { message });

const optionalPositiveNumber = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return undefined;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number({ invalid_type_error: "Debe ser un número" }).int().positive("Debe ser mayor a 0").optional());

export const CreateCompanyWithAdminSchema = z
  .object({
    name: requiredTrimmedString("La razón social es requerida"),
    subName: optionalTrimmedString,
    ruc: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .length(11, "El RUC debe tener 11 dígitos")
        .regex(/^\d+$/, "El RUC solo debe contener números")
        .optional(),
    ),
    address: requiredTrimmedString("La dirección es requerida"),
    district: optionalTrimmedString,
    provincial: optionalTrimmedString,
    department: optionalTrimmedString,
    phone: optionalTrimmedString,
    email: z.preprocess(
      emptyToUndefined,
      z.string().email("El email de la empresa no es válido").optional(),
    ),
    subdomain: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "El subdominio es requerido")
      .regex(
        /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
        "Usa solo letras minúsculas, números y guiones",
      ),
    billingToken: optionalTrimmedString,
    customerSearchToken: optionalTrimmedString,
    invoiceSerialNumber: optionalTrimmedString,
    invoiceStartsOnNumber: optionalPositiveNumber,
    receiptSerialNumber: optionalTrimmedString,
    receiptStartsOnNumber: optionalPositiveNumber,
    ticketSerialNumber: requiredTrimmedString("La serie de ticket es requerida"),
    establishmentCode: optionalTrimmedString,
    adminName: requiredTrimmedString("El nombre del administrador es requerido"),
    adminEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email("El email del administrador no es válido"),
    adminPassword: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
    adminRepeatPassword: z.string(),
  })
  .refine((data) => data.adminPassword === data.adminRepeatPassword, {
    message: "Las contraseñas deben coincidir",
    path: ["adminRepeatPassword"],
  });

export type CreateCompanyWithAdminInput = z.infer<
  typeof CreateCompanyWithAdminSchema
>;
