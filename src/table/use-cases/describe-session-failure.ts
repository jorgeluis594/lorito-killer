import type { ErrorResponse } from "@/lib/types";

export type ServiceChannel = "TABLE" | "TAKE_AWAY" | "DELIVERY";

export type SessionFailureType = Extract<
  NonNullable<ErrorResponse["type"]>,
  | "SessionChanged"
  | "SessionClosed"
  | "OrderLocked"
  | "SessionHasProducts"
  | "SessionInvalid"
  | "SessionUnavailable"
  | "RoundConflict"
>;

export type SessionFailureAction = "viewSaved" | "backToTables" | "goToPayment";

const noTableMessages: Record<SessionFailureType, string> = {
  SessionChanged:
    "El pedido cambió en otro dispositivo. Tus cambios siguen aquí; revisa el pedido antes de continuar.",
  SessionClosed: "Este pedido ya se cerró.",
  OrderLocked: "Este pedido ya no admite cambios.",
  SessionHasProducts: "El pedido tiene productos y no se puede liberar.",
  SessionInvalid: "El pedido no es válido. Vuelve a Mesas y ábrelo de nuevo.",
  SessionUnavailable: "Este pedido ya no está disponible.",
  RoundConflict:
    "Otro envío cambió el pedido. Actualiza el pedido y vuelve a intentarlo.",
};

const actions: Record<SessionFailureType, SessionFailureAction[]> = {
  SessionChanged: ["viewSaved"],
  RoundConflict: ["viewSaved"],
  SessionClosed: ["backToTables"],
  SessionUnavailable: ["backToTables"],
  SessionInvalid: ["backToTables"],
  OrderLocked: ["backToTables", "goToPayment"],
  SessionHasProducts: [],
};

export const isSessionFailureType = (
  type: ErrorResponse["type"] | undefined,
): type is SessionFailureType =>
  type !== undefined && Object.hasOwn(noTableMessages, type);

/** Texto de un rechazo en un pedido sin mesa: nunca dice «mesa». */
export const noTableFailureMessage = (type: SessionFailureType) =>
  noTableMessages[type];

/** Mesas conservan el texto del servidor; los pedidos sin mesa lo traducen por `type`. */
export function sessionFailureMessage(
  result: { message: string; type?: ErrorResponse["type"] },
  channel: ServiceChannel,
): string {
  if (channel === "TABLE" || !isSessionFailureType(result.type))
    return result.message;
  return noTableFailureMessage(result.type);
}

/** Botones de recuperación por `type`, iguales para mesas y pedidos sin mesa. */
export const sessionFailureActions = (
  type: ErrorResponse["type"] | undefined,
): SessionFailureAction[] =>
  isSessionFailureType(type) ? actions[type] : [];

export const serviceChannel = (session: {
  tableId: string | null;
  delivery?: unknown;
}): ServiceChannel =>
  session.tableId ? "TABLE" : session.delivery ? "DELIVERY" : "TAKE_AWAY";

export const releaseLabel = (channel: ServiceChannel) =>
  channel === "TABLE"
    ? "Liberar mesa"
    : channel === "DELIVERY"
      ? "Liberar delivery"
      : "Liberar pedido";
