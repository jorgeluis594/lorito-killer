/**
 * Efectivo con el que se prellena el cobro: el “paga con” registrado cuando el
 * medio esperado es efectivo. Sin “paga con” el campo queda vacío.
 */
export const initialCashReceived = (
  expectedPaymentMethod: "CASH" | "WALLET" | null | undefined,
  cashPaysWith: number | null | undefined,
): string =>
  expectedPaymentMethod === "CASH" && cashPaysWith && cashPaysWith > 0
    ? String(cashPaysWith)
    : "";
