import { describe, expect, test } from "vitest";
import { normalizeCustomerName } from "@/delivery/use-cases/normalize-customer-name";

describe("normalizeCustomerName", () => {
  test("guarda «  Rosa » como «Rosa»", () => {
    expect(normalizeCustomerName("  Rosa ")).toEqual({
      success: true,
      data: "Rosa",
    });
  });

  test("convierte un nombre vacío o de solo espacios en null", () => {
    for (const value of ["", "   ", null, undefined])
      expect(normalizeCustomerName(value)).toEqual({
        success: true,
        data: null,
      });
  });

  test("acepta un nombre de 120 caracteres", () => {
    expect(normalizeCustomerName("a".repeat(120))).toEqual({
      success: true,
      data: "a".repeat(120),
    });
  });

  test("rechaza un nombre de 121 caracteres con «El nombre puede tener hasta 120 caracteres.»", () => {
    expect(normalizeCustomerName("a".repeat(121))).toEqual({
      success: false,
      message: "El nombre puede tener hasta 120 caracteres.",
    });
  });
});
