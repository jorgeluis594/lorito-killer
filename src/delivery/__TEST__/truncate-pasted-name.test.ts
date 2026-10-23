import { describe, expect, test } from "vitest";
import { truncatePastedName } from "@/delivery/use-cases/truncate-pasted-name";

describe("truncatePastedName", () => {
  test("pegar 150 caracteres en un campo vacío deja 120 y avisa el recorte", () => {
    const result = truncatePastedName({
      value: "",
      selectionStart: 0,
      selectionEnd: 0,
      pasted: "a".repeat(150),
    });
    expect(result.value).toHaveLength(120);
    expect(result.truncated).toBe(true);
  });

  test("pegar sobre una selección cuenta solo lo que queda fuera de ella", () => {
    const result = truncatePastedName({
      value: "a".repeat(120),
      selectionStart: 0,
      selectionEnd: 100,
      pasted: "b".repeat(100),
    });
    expect(result.value).toBe("b".repeat(100) + "a".repeat(20));
    expect(result.truncated).toBe(false);
  });

  test("pegar un texto que cabe no recorta ni avisa", () => {
    expect(
      truncatePastedName({
        value: "Ro",
        selectionStart: 2,
        selectionEnd: 2,
        pasted: "sa",
      }),
    ).toEqual({ value: "Rosa", caret: 4, truncated: false });
  });

  test("deja el cursor al final de lo pegado", () => {
    const result = truncatePastedName({
      value: "Rosa ",
      selectionStart: 2,
      selectionEnd: 2,
      pasted: "x".repeat(200),
    });
    expect(result.value).toHaveLength(120);
    expect(result.caret).toBe(2 + 115);
    expect(result.value.slice(result.caret)).toBe("sa ");
  });
});
