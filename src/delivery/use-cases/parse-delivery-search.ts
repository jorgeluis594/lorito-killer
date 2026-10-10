/**
 * Interpreta el texto de búsqueda de la lista: siempre busca por nombre y por
 * teléfono solo si el texto es mayormente numérico (“Ana 9” no es un teléfono).
 * Los teléfonos se guardan sin el prefijo 51, así que se quita de la búsqueda.
 */
export function parseDeliverySearch(raw: string | undefined): {
  text: string;
  phoneDigits: string | null;
} {
  const text = raw?.trim() ?? "";
  if (!text) return { text: "", phoneDigits: null };
  let digits = text.replace(/\D/g, "");
  const compact = text.replace(/[\s+-]/g, "");
  if (!digits || digits.length / compact.length < 0.5)
    return { text, phoneDigits: null };
  if (digits.startsWith("51") && (text.startsWith("+51") || digits.length > 9))
    digits = digits.slice(2);
  return { text, phoneDigits: digits || null };
}
