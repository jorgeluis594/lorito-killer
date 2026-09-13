import { z } from "zod";
import type { Payment } from "./types";

export const walletPaymentDetailsSchema = z.object({
  name: z
    .string({
      required_error: "Ingrese la billetera",
      invalid_type_error: "Ingrese la billetera",
    })
    .trim()
    .min(1, "Ingrese la billetera")
    .max(80, "La billetera admite hasta 80 caracteres"),
  operationCode: z
    .string({
      required_error: "Ingrese el código de operación",
      invalid_type_error: "Ingrese el código de operación",
    })
    .trim()
    .min(1, "Ingrese el código de operación")
    .max(100, "El código de operación admite hasta 100 caracteres"),
});

export function walletPaymentReference(payment: Payment): string {
  if (payment.method !== "wallet") return "";
  return [
    payment.name,
    payment.operationCode && `Operación: ${payment.operationCode}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
