import type { response } from "@/lib/types";
import type { DeliveryDetails } from "./validate-delivery-details";

export const LOCKED_BY_DOCUMENT_MESSAGE =
  "El pedido ya tiene comprobante: solo se puede corregir el contacto. No se guardó ningún cambio.";

export type DeliveryEditPlan = {
  /** Cambió el envío, el medio esperado o “paga con”. */
  logisticsChanged: boolean;
  /** Cambió el envío: obliga a recalcular `Order.total`. */
  feeChanged: boolean;
};

const cents = (value: number) => Math.round(value * 100);

/**
 * Decide qué cambia una edición y si el pedido la admite. El contacto se edita
 * siempre; envío, medio esperado y “paga con” solo mientras no haya comprobante.
 * Una solicitud que toca la logística de un pedido bloqueado se rechaza entera,
 * aunque también cambie el contacto.
 */
export function planDeliveryEdit(
  current: DeliveryDetails,
  next: DeliveryDetails,
  locked: boolean,
): response<DeliveryEditPlan> {
  const feeChanged = cents(current.fee) !== cents(next.fee);
  const logisticsChanged =
    feeChanged ||
    current.expectedPaymentMethod !== next.expectedPaymentMethod ||
    (current.cashPaysWith === null) !== (next.cashPaysWith === null) ||
    (current.cashPaysWith !== null &&
      next.cashPaysWith !== null &&
      cents(current.cashPaysWith) !== cents(next.cashPaysWith));
  if (locked && logisticsChanged)
    return { success: false, message: LOCKED_BY_DOCUMENT_MESSAGE };
  return { success: true, data: { logisticsChanged, feeChanged } };
}
