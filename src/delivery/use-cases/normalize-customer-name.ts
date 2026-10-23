import type { response } from "@/lib/types";

export const CUSTOMER_NAME_MAX = 120;

/** Recorta y convierte un nombre vacío en `null`; rechaza más de 120 caracteres. */
export function normalizeCustomerName(
  value: string | null | undefined,
): response<string | null> {
  const name = value?.trim() ?? "";
  if (name.length > CUSTOMER_NAME_MAX)
    return {
      success: false,
      message: `El nombre puede tener hasta ${CUSTOMER_NAME_MAX} caracteres.`,
    };
  return { success: true, data: name || null };
}
