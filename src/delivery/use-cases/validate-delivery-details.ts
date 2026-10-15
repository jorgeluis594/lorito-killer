export type DeliveryDetailsField =
  | "name"
  | "phone"
  | "address"
  | "reference"
  | "fee";

export type DeliveryDetailsInput = {
  name?: unknown;
  phone?: unknown;
  address?: unknown;
  reference?: unknown;
  fee?: unknown;
};

export type DeliveryDetails = {
  name: string | null;
  phone: string;
  address: string;
  reference: string | null;
  fee: number;
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

function optionalText(value: unknown, max: number) {
  if (isMissing(value)) return { value: null };
  if (typeof value !== "string") return { error: "El valor no es válido." };
  const text = value.trim();
  return text.length > max
    ? { error: `Máximo ${max} caracteres.` }
    : { value: text || null };
}

/** Reglas puras de los datos de entrega: teléfono y dirección obligatorios. */
export function validateDeliveryDetails(
  input: DeliveryDetailsInput | null | undefined,
): DeliveryDetailsResult {
  const errors: DeliveryDetailsErrors = {};
  const raw = input ?? {};

  const name = optionalText(raw.name, NAME_MAX);
  if (name.error) errors.name = name.error;

  const phone = normalizeDeliveryPhone(raw.phone);
  if (!phone)
    errors.phone =
      "Ingresa un celular de 9 dígitos que empiece con 9 (ej. 987 654 321).";

  const address = requiredText(raw.address, ADDRESS_MAX, "la dirección");
  if (address.error) errors.address = address.error;

  const reference = optionalText(raw.reference, REFERENCE_MAX);
  if (reference.error) errors.reference = reference.error;

  const fee = isMissing(raw.fee) ? Number.NaN : toAmount(raw.fee);
  if (isMissing(raw.fee))
    errors.fee = "Ingresa el monto de envío (0 si es gratis).";
  else if (!Number.isFinite(fee) || fee < 0)
    errors.fee = "El envío debe ser un monto mayor o igual a 0.";
  else if (!hasAtMostTwoDecimals(fee))
    errors.fee = "El envío admite hasta dos decimales.";
  else if (fee > 99999999.99) errors.fee = "El envío es demasiado alto.";

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
      name: name.value ?? null,
      phone: phone!,
      address: address.value!,
      reference: reference.value ?? null,
      fee,
    },
  };
}
