import { CUSTOMER_NAME_MAX } from "./normalize-customer-name";

/** Conserva hasta 120 caracteres al pegar y deja el cursor al final de lo pegado. */
export function truncatePastedName(input: {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  pasted: string;
}): { value: string; caret: number; truncated: boolean } {
  const before = input.value.slice(0, input.selectionStart);
  const after = input.value.slice(input.selectionEnd);
  const room = Math.max(0, CUSTOMER_NAME_MAX - before.length - after.length);
  const pasted = input.pasted.slice(0, room);
  return {
    value: before + pasted + after,
    caret: before.length + pasted.length,
    truncated: pasted.length < input.pasted.length,
  };
}
