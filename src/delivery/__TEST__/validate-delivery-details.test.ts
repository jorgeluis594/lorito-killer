import { describe, expect, test } from "vitest";
import {
  normalizeDeliveryPhone,
  validateDeliveryDetails,
} from "../use-cases/validate-delivery-details";

const valid = {
  name: "  Ana Torres ",
  phone: "+51 987 654 321",
  address: "Av. Lima 123",
  reference: "Portón verde",
  fee: 5,
};

const errorsOf = (input: Parameters<typeof validateDeliveryDetails>[0]) => {
  const result = validateDeliveryDetails(input);
  return result.success ? {} : result.errors;
};

describe("normalizeDeliveryPhone", () => {
  test.each(["987654321", "987 654 321", "+51 987654321", "+51987654321"])(
    "acepta %s y guarda 987654321",
    (phone) => expect(normalizeDeliveryPhone(phone)).toBe("987654321"),
  );

  test.each([
    "87654321",
    "187654321",
    "98765432a",
    "",
    "+52 987654321",
    987654321,
  ])("rechaza %s", (phone) => expect(normalizeDeliveryPhone(phone)).toBeNull());
});

describe("validateDeliveryDetails", () => {
  test("normaliza contacto, referencia y envío", () => {
    expect(validateDeliveryDetails(valid)).toEqual({
      success: true,
      data: {
        name: "Ana Torres",
        phone: "987654321",
        address: "Av. Lima 123",
        reference: "Portón verde",
        fee: 5,
      },
    });
  });

  test("la referencia y el nombre son opcionales", () => {
    const result = validateDeliveryDetails({
      ...valid,
      reference: "  ",
      name: undefined,
    });
    expect(result).toMatchObject({
      success: true,
      data: { reference: null, name: null },
    });
  });

  test.each(["phone", "address", "fee"] as const)(
    "rechaza sin %s e indica el campo",
    (field) => {
      const result = validateDeliveryDetails({ ...valid, [field]: undefined });
      expect(result.success).toBe(false);
      expect(Object.keys(errorsOf({ ...valid, [field]: undefined }))).toEqual([
        field,
      ]);
    },
  );

  test("indica todos los campos faltantes en el mensaje", () => {
    const result = validateDeliveryDetails({});
    expect(result).toMatchObject({ success: false });
    expect(!result.success && result.message).not.toContain("nombre");
    expect(!result.success && result.message).toContain("teléfono");
    expect(!result.success && result.message).toContain("dirección");
    expect(!result.success && result.message).toContain("envío");
  });

  test("respeta los máximos de longitud", () => {
    expect(errorsOf({ ...valid, name: "a".repeat(121) })).toHaveProperty(
      "name",
    );
    expect(errorsOf({ ...valid, address: "a".repeat(301) })).toHaveProperty(
      "address",
    );
    expect(errorsOf({ ...valid, reference: "a".repeat(301) })).toHaveProperty(
      "reference",
    );
    expect(errorsOf({ ...valid, name: "a".repeat(120) })).toEqual({});
  });

  test("envío 0 es gratis; negativos y más de dos decimales se rechazan", () => {
    expect(validateDeliveryDetails({ ...valid, fee: 0 }).success).toBe(true);
    expect(validateDeliveryDetails({ ...valid, fee: "0" }).success).toBe(true);
    expect(validateDeliveryDetails({ ...valid, fee: 12.5 }).success).toBe(true);
    expect(errorsOf({ ...valid, fee: -1 })).toHaveProperty("fee");
    expect(errorsOf({ ...valid, fee: 5.555 })).toHaveProperty("fee");
    expect(errorsOf({ ...valid, fee: "abc" })).toHaveProperty("fee");
    expect(errorsOf({ ...valid, fee: Number.NaN })).toHaveProperty("fee");
  });
});
