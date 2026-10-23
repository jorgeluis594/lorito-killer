export type PaymentRouteResult =
  | { ok: true; href: string }
  | { ok: false; reason: "unsaved" | "no-session" };

/**
 * Destino del cobro desde la toma de pedido. `flush` guarda el borrador antes de
 * salir; la recuperación de `OrderLocked` no lo pasa porque guardar sobre un
 * pedido bloqueado solo vuelve a fallar.
 */
export async function resolvePaymentRoute(input: {
  paymentHref: string;
  sessionId: string;
  flush?: () => Promise<boolean>;
}): Promise<PaymentRouteResult> {
  if (input.flush && !(await input.flush()))
    return { ok: false, reason: "unsaved" };
  if (!input.sessionId) return { ok: false, reason: "no-session" };
  // A free table gets its session on the first save, after the page built paymentHref.
  return {
    ok: true,
    href: input.paymentHref.replace(
      /session=[^&]*/,
      `session=${input.sessionId}`,
    ),
  };
}
