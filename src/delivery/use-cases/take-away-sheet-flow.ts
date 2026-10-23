import type { SaveCustomerNameResult } from "../types";

export const SAVED_NAME_TOAST = "Nombre guardado";
export const PASTE_TRUNCATED_HINT = "Se recortó a 120 caracteres.";

const uncertainMessages = {
  create:
    "No se recibió la respuesta. Vuelve a tocar Continuar al pedido: si el pedido ya se creó, se abre ese mismo.",
  edit: "No se recibió la respuesta. Vuelve a intentar; guardar de nuevo no duplica nada.",
} as const;

type OpenResult =
  | { success: true; data: { sessionId: string } }
  | {
      success: false;
      message: string;
      type?: string;
      errors?: { customerName?: string };
    };

export type TakeAwaySheetOutcome =
  | { kind: "opened"; sessionId: string }
  | { kind: "saved"; customerName: string | null }
  /** Otro dispositivo cambió el nombre: la hoja adopta `currentName` como esperado. */
  | { kind: "conflict"; currentName: string | null; message: string }
  | { kind: "invalid"; message: string }
  /** El pedido se cerró o ya no existe: solo queda volver a Mesas. */
  | { kind: "unavailable"; message: string }
  | { kind: "rejected"; message: string }
  /** Sin respuesta: la apertura se puede repetir con la misma clave. */
  | { kind: "uncertain"; message: string };

/** Envía la hoja y traduce la respuesta a lo que la hoja debe mostrar. */
export async function submitTakeAwaySheet(input: {
  mode: "create" | "edit";
  /** Clave del intento al crear; id de la sesión al editar. */
  sessionId: string;
  name: string;
  expectedName: string | null;
  openTakeAway: (input: {
    sessionId: string;
    customerName: string | null;
  }) => Promise<OpenResult>;
  saveCustomerName: (input: {
    sessionId: string;
    customerName: string | null;
    expectedName: string | null;
  }) => Promise<SaveCustomerNameResult>;
}): Promise<TakeAwaySheetOutcome> {
  const customerName = input.name;
  try {
    if (input.mode === "create") {
      const result = await input.openTakeAway({
        sessionId: input.sessionId,
        customerName,
      });
      if (result.success)
        return { kind: "opened", sessionId: result.data.sessionId };
      if (result.errors?.customerName)
        return { kind: "invalid", message: result.errors.customerName };
      return { kind: "rejected", message: result.message };
    }
    const result = await input.saveCustomerName({
      sessionId: input.sessionId,
      customerName,
      expectedName: input.expectedName,
    });
    if (result.success)
      return { kind: "saved", customerName: result.data.customerName };
    if (result.type === "CustomerNameConflict" && "currentName" in result)
      return {
        kind: "conflict",
        currentName: result.currentName,
        message: result.message,
      };
    if ("errors" in result && result.errors?.customerName)
      return { kind: "invalid", message: result.errors.customerName };
    if (result.type === "SessionClosed" || result.type === "SessionUnavailable")
      return { kind: "unavailable", message: result.message };
    return { kind: "rejected", message: result.message };
  } catch {
    return { kind: "uncertain", message: uncertainMessages[input.mode] };
  }
}

/** Cerrar la hoja refresca Mesas solo tras un intento sin respuesta. */
export function shouldRefreshOnClose(state: { uncertain: boolean }) {
  return state.uncertain;
}
