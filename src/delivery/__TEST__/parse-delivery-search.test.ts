import { describe, expect, test } from "vitest";
import { parseDeliverySearch } from "../use-cases/parse-delivery-search";

describe("parseDeliverySearch", () => {
  test.each([
    ["654", "654"],
    ["987 654", "987654"],
    ["+51 987 654", "987654"],
    ["51987654321", "987654321"],
    ["+51", null],
  ])("teléfono %s → %s", (input, phone) => {
    expect(parseDeliverySearch(input).phoneDigits).toBe(phone);
  });

  test.each(["ana", "Ana 9", "Mariana López", ""])(
    "%s no busca por teléfono",
    (input) => {
      expect(parseDeliverySearch(input).phoneDigits).toBeNull();
    },
  );

  test("conserva el texto recortado para buscar por nombre", () => {
    expect(parseDeliverySearch("  Ana ").text).toBe("Ana");
  });
});
