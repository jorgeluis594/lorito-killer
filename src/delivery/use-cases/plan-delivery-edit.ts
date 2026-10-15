import type { response } from "@/lib/types";
import type { DeliveryDetails } from "./validate-delivery-details";

export const LOCKED_BY_DOCUMENT_MESSAGE =
  "El pedido ya tiene comprobante: solo se puede corregir el contacto. No se guardó ningún cambio.";

const cents = (value: number) => Math.round(value * 100);

/**
 * Decide si el pedido admite la edición. El contacto se edita siempre; el
 * envío, solo mientras no haya comprobante. Una solicitud que cambia el envío
 * de un pedido bloqueado se rechaza entera, aunque también cambie el contacto.
 */
export function planDeliveryEdit(
  current: Pick<DeliveryDetails, "fee">,
  next: Pick<DeliveryDetails, "fee">,
  locked: boolean,
): response<{ feeChanged: boolean }> {
  const feeChanged = cents(current.fee) !== cents(next.fee);
  if (locked && feeChanged)
    return { success: false, message: LOCKED_BY_DOCUMENT_MESSAGE };
  return { success: true, data: { feeChanged } };
}
