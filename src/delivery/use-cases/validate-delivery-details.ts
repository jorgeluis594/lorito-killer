import type { response } from "@/lib/types";

export const DELIVERY_EXPECTED_PAYMENTS = ["CASH", "WALLET"] as const;
export type DeliveryExpectedPayment =
  (typeof DELIVERY_EXPECTED_PAYMENTS)[number];

export type DeliveryDetailsField =
  | "name"
  | "phone"
  | "address"
  | "reference"
  | "fee"
  | "expectedPaymentMethod"
  | "cashPaysWith";

export type DeliveryDetailsInput = {
  name?: unknown;
  phone?: unknown;
  address?: unknown;
  reference?: unknown;
  fee?: unknown;
  expectedPaymentMethod?: unknown;
  cashPaysWith?: unknown;
};

export type DeliveryDetails = {
  name: string;
  phone: string;
  address: string;
  reference: string | null;
  fee: number;
  expectedPaymentMethod: DeliveryExpectedPayment | null;
  cashPaysWith: number | null;
};

export type DeliveryDetailsErrors = Partial<
  Record<DeliveryDetailsField, string>
>;

export type DeliveryDetailsResult =
  | { success: true; data: DeliveryDetails }
  | { success: false; message: string; errors: DeliveryDetailsErrors };

const FIELD_LABELS: Record<DeliveryDetailsField, string> = {
  name: "nombre",
  phone: "teléfono",
  address: "dirección",
  reference: "referencia",
  fee: "envío",
  expectedPaymentMethod: "medio de pago esperado",
  cashPaysWith: "paga con",
};

const NAME_MAX = 120;
const ADDRESS_MAX = 300;
const REFERENCE_MAX = 300;

/** Acepta `987654321`, `987 654 321` y `+51 987654321`; devuelve 9 dígitos. */
export function normalizeDeliveryPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value.replace(/[\s-]/g, "");
  const national = compact.startsWith("+51") ? compact.slice(3) : compact;
  return /^9\d{8}$/.test(national) ? national : null;
}

const hasAtMostTwoDecimals = (value: number) =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

const isMissing = (value: unknown) =>
  value === undefined || value === null || value === "";

/** Número recibido como número o como texto; NaN si no es numérico. */
function toAmount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim()))
    return Number(value.trim());
  return Number.NaN;
}

function requiredText(
  value: unknown,
  max: number,
  label: string,
): { value?: string; error?: string } {
  if (typeof value !== "string" || !value.trim())
    return { error: `Ingresa ${label}.` };
  const text = value.trim();
  return text.length > max
    ? { error: `Máximo ${max} caracteres.` }
    : { value: text };
}

/**
 * Reglas puras de los datos de entrega. `total` (ítems + envío) permite validar
 * “paga con” cuando ya se conoce; sin él solo se valida la forma.
 */
export function validateDeliveryDetails(
  input: DeliveryDetailsInput | null | undefined,
  total?: number,
): DeliveryDetailsResult {
  const errors: DeliveryDetailsErrors = {};
  const raw = input ?? {};

  const name = requiredText(raw.name, NAME_MAX, "el nombre del cliente");
  if (name.error) errors.name = name.error;

  const phone = normalizeDeliveryPhone(raw.phone);
  if (!phone)
    errors.phone =
      "Ingresa un celular de 9 dígitos que empiece con 9 (ej. 987 654 321).";

  const address = requiredText(raw.address, ADDRESS_MAX, "la dirección");
  if (address.error) errors.address = address.error;

  let reference: string | null = null;
  if (!isMissing(raw.reference)) {
    if (typeof raw.reference !== "string")
      errors.reference = "La referencia no es válida.";
    else {
      const text = raw.reference.trim();
      if (text.length > REFERENCE_MAX)
        errors.reference = `Máximo ${REFERENCE_MAX} caracteres.`;
      else reference = text || null;
    }
  }

  const fee = isMissing(raw.fee) ? Number.NaN : toAmount(raw.fee);
  if (isMissing(raw.fee))
    errors.fee = "Ingresa el monto de envío (0 si es gratis).";
  else if (!Number.isFinite(fee) || fee < 0)
    errors.fee = "El envío debe ser un monto mayor o igual a 0.";
  else if (!hasAtMostTwoDecimals(fee))
    errors.fee = "El envío admite hasta dos decimales.";
  else if (fee > 99999999.99) errors.fee = "El envío es demasiado alto.";

  let expectedPaymentMethod: DeliveryExpectedPayment | null = null;
  if (!isMissing(raw.expectedPaymentMethod)) {
    if (
      !DELIVERY_EXPECTED_PAYMENTS.includes(
        raw.expectedPaymentMethod as DeliveryExpectedPayment,
      )
    )
      errors.expectedPaymentMethod = "Elige efectivo o billetera.";
    else
      expectedPaymentMethod =
        raw.expectedPaymentMethod as DeliveryExpectedPayment;
  }

  let cashPaysWith: number | null = null;
  if (!isMissing(raw.cashPaysWith)) {
    const amount = toAmount(raw.cashPaysWith);
    if (expectedPaymentMethod !== "CASH")
      errors.cashPaysWith = "“Paga con” solo aplica al pago en efectivo.";
    else if (!Number.isFinite(amount) || amount <= 0)
      errors.cashPaysWith = "“Paga con” debe ser mayor a 0.";
    else if (!hasAtMostTwoDecimals(amount))
      errors.cashPaysWith = "“Paga con” admite hasta dos decimales.";
    else if (amount > 99999999.99)
      errors.cashPaysWith = "“Paga con” es demasiado alto.";
    else {
      cashPaysWith = amount;
      const toPay = total ?? undefined;
      if (toPay !== undefined && !coversTotal(amount, toPay))
        errors.cashPaysWith = `“Paga con” debe ser al menos el total (${toPay.toFixed(2)}).`;
    }
  }

  const fields = Object.keys(errors) as DeliveryDetailsField[];
  if (fields.length)
    return {
      success: false,
      errors,
      message: `Revisa los datos de entrega: ${fields
        .map((field) => FIELD_LABELS[field])
        .join(", ")}.`,
    };

  return {
    success: true,
    data: {
      name: name.value!,
      phone: phone!,
      address: address.value!,
      reference,
      fee,
      expectedPaymentMethod,
      cashPaysWith,
    },
  };
}

/** “Paga con” cubre el total (comparación en centavos, sin error de flotantes). */
export function coversTotal(cashPaysWith: number, total: number): boolean {
  return Math.round(cashPaysWith * 100) >= Math.round(total * 100);
}

export const CASH_PAYS_WITH_BELOW_TOTAL_MESSAGE =
  "“Paga con” quedaría por debajo del nuevo total del pedido.";

/** Revalida “paga con” tras cambiar el total (adiciones, retiros). */
export function validateCashPaysWithCoversTotal(
  cashPaysWith: number | null | undefined,
  total: number,
): response<null> {
  if (cashPaysWith == null || coversTotal(cashPaysWith, total))
    return { success: true, data: null };
  return { success: false, message: CASH_PAYS_WITH_BELOW_TOTAL_MESSAGE };
}
