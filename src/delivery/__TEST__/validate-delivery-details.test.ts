import { describe, expect, test } from "vitest";
import {
  coversTotal,
  normalizeDeliveryPhone,
  validateCashPaysWithCoversTotal,
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
        expectedPaymentMethod: null,
        cashPaysWith: null,
      },
    });
  });

  test("la referencia es opcional", () => {
    const result = validateDeliveryDetails({ ...valid, reference: "  " });
    expect(result.success && result.data.reference).toBeNull();
  });

  test.each(["name", "phone", "address", "fee"] as const)(
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
    expect(!result.success && result.message).toContain("nombre");
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

  test("“paga con” solo con efectivo y positivo", () => {
    expect(
      errorsOf({
        ...valid,
        expectedPaymentMethod: "WALLET",
        cashPaysWith: 100,
      }),
    ).toHaveProperty("cashPaysWith");
    expect(errorsOf({ ...valid, cashPaysWith: 100 })).toHaveProperty(
      "cashPaysWith",
    );
    expect(
      errorsOf({ ...valid, expectedPaymentMethod: "CASH", cashPaysWith: 0 }),
    ).toHaveProperty("cashPaysWith");
    expect(
      validateDeliveryDetails({
        ...valid,
        expectedPaymentMethod: "CASH",
        cashPaysWith: "100",
      }),
    ).toMatchObject({ success: true, data: { cashPaysWith: 100 } });
  });

  test("“paga con” debe cubrir el total cuando se conoce", () => {
    const cash = { ...valid, expectedPaymentMethod: "CASH", cashPaysWith: 50 };
    expect(validateDeliveryDetails(cash, 55)).toMatchObject({ success: false });
    expect(validateDeliveryDetails(cash, 50).success).toBe(true);
  });

  test("rechaza un medio esperado desconocido", () => {
    expect(
      errorsOf({ ...valid, expectedPaymentMethod: "CARD" }),
    ).toHaveProperty("expectedPaymentMethod");
  });
});

describe("“paga con” contra el total", () => {
  test("compara en centavos", () => {
    expect(coversTotal(55, 55)).toBe(true);
    expect(coversTotal(54.99, 55)).toBe(false);
    expect(coversTotal(0.3, 0.1 + 0.2)).toBe(true);
  });

  test("sin “paga con” siempre es válido", () => {
    expect(validateCashPaysWithCoversTotal(null, 999).success).toBe(true);
    expect(validateCashPaysWithCoversTotal(60, 55).success).toBe(true);
    expect(validateCashPaysWithCoversTotal(60, 85).success).toBe(false);
  });
});
