import Decimal from "decimal.js";
import type { response } from "@/lib/types";
import type { Payment } from "../types";

export function splitPaymentAmounts(total: number, parts: number): number[] {
  if (!Number.isFinite(total) || total <= 0 || !Number.isInteger(parts) || parts < 2) {
    throw new RangeError("El total y la cantidad de partes deben ser validos");
  }

  const totalCents = new Decimal(total).mul(100).round().toNumber();
  const baseCents = Math.floor(totalCents / parts);
  const remainder = totalCents - baseCents * parts;

  return Array.from({ length: parts }, (_, index) =>
    (baseCents + (index >= parts - remainder ? 1 : 0)) / 100,
  );
}

export function validatePayments(
  total: number,
  payments: Payment[],
): response<void> {
  if (!payments.length) {
    return { success: false, message: "Agrega al menos un aporte de pago" };
  }

  if (payments.some(({ amount }) => !Number.isFinite(amount) || amount <= 0)) {
    return { success: false, message: "Cada aporte debe tener un monto mayor a cero" };
  }

  const paid = payments.reduce(
    (sum, payment) => sum.add(payment.amount),
    new Decimal(0),
  );
  if (!paid.equals(total)) {
    return { success: false, message: "La suma de los pagos debe coincidir con el total" };
  }

  return { success: true, data: undefined };
}
