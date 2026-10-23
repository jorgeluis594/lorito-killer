import { describe, expect, test } from "vitest";
import { decideCustomerNameSave } from "@/delivery/use-cases/decide-customer-name-save";

describe("decideCustomerNameSave", () => {
  test("guarda cuando el nombre guardado es el que vio la hoja", () => {
    expect(
      decideCustomerNameSave({
        current: "Rosa",
        expected: "Rosa",
        next: "Rosa M.",
      }),
    ).toEqual({ kind: "save" });
    expect(
      decideCustomerNameSave({ current: null, expected: null, next: "Rosa" }),
    ).toEqual({ kind: "save" });
  });

  test("da éxito sin escribir cuando el nombre nuevo ya es el guardado", () => {
    expect(
      decideCustomerNameSave({
        current: "Rosa M.",
        expected: "Rosa",
        next: "Rosa M.",
      }),
    ).toEqual({ kind: "unchanged" });
    expect(
      decideCustomerNameSave({ current: null, expected: "Rosa", next: null }),
    ).toEqual({ kind: "unchanged" });
  });

  test("rechaza con el nombre actual cuando otro dispositivo lo cambió a «Rosita»", () => {
    expect(
      decideCustomerNameSave({
        current: "Rosita",
        expected: "Rosa",
        next: "Rosa M.",
      }),
    ).toEqual({ kind: "conflict", current: "Rosita" });
  });

  test("rechaza como nombre quitado cuando otro dispositivo lo dejó vacío", () => {
    expect(
      decideCustomerNameSave({
        current: null,
        expected: "Rosa",
        next: "Rosa M.",
      }),
    ).toEqual({ kind: "conflict", current: null });
  });

  test("guarda lo escrito cuando el nombre esperado ya es el que devolvió el conflicto", () => {
    expect(
      decideCustomerNameSave({
        current: "Rosita",
        expected: "Rosita",
        next: "Rosa M.",
      }),
    ).toEqual({ kind: "save" });
  });
});
