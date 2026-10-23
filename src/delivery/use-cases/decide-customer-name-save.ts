export type CustomerNameSaveDecision =
  | { kind: "unchanged" }
  | { kind: "save" }
  | { kind: "conflict"; current: string | null };

/**
 * Solo hay conflicto si otro dispositivo cambió el nombre desde que se abrió la
 * hoja; guardar el nombre que ya está guardado es éxito.
 */
export function decideCustomerNameSave(input: {
  current: string | null;
  expected: string | null;
  next: string | null;
}): CustomerNameSaveDecision {
  if (input.next === input.current) return { kind: "unchanged" };
  if (input.current !== input.expected)
    return { kind: "conflict", current: input.current };
  return { kind: "save" };
}
