import { describe, expect, test, vi } from "vitest";
import { resolveOrderSellerId } from "@/order/use-cases/resolve-order-seller-id";

const companyId = "company-1";

describe("resolveOrderSellerId", () => {
  test("returns null without requiring a seller code when seller is disabled", async () => {
    const isFeatureEnabled = vi.fn(async () => false);
    const findActiveSellerIdByCode = vi.fn(async () => "seller-1");

    const result = await resolveOrderSellerId(
      { companyId, sellerCode: "not-a-code" },
      { isFeatureEnabled, findActiveSellerIdByCode },
    );

    expect(result).toEqual({ success: true, data: null });
    expect(isFeatureEnabled).toHaveBeenCalledWith(companyId, "seller");
    expect(findActiveSellerIdByCode).not.toHaveBeenCalled();
  });

  test.for([
    { label: "undefined", sellerCode: undefined },
    { label: "null", sellerCode: null },
    { label: "empty", sellerCode: "" },
    { label: "too short", sellerCode: "123" },
    { label: "too long", sellerCode: "12345" },
    { label: "non-numeric", sellerCode: "abcd" },
  ] as const)(
    "rejects $label seller code when seller is enabled",
    async ({ sellerCode }) => {
      const isFeatureEnabled = vi.fn(async () => true);
      const findActiveSellerIdByCode = vi.fn(async () => "seller-1");

      const result = await resolveOrderSellerId(
        { companyId, sellerCode },
        { isFeatureEnabled, findActiveSellerIdByCode },
      );

      expect(result).toEqual({
        success: false,
        message: "El codigo debe tener exactamente 4 digitos",
      });
      expect(findActiveSellerIdByCode).not.toHaveBeenCalled();
    },
  );

  test("rejects an unknown seller code when seller is enabled", async () => {
    const isFeatureEnabled = vi.fn(async () => true);
    const findActiveSellerIdByCode = vi.fn(async () => null);

    const result = await resolveOrderSellerId(
      { companyId, sellerCode: "1234" },
      { isFeatureEnabled, findActiveSellerIdByCode },
    );

    expect(result).toEqual({
      success: false,
      message: "Codigo de seller no encontrado",
    });
    expect(findActiveSellerIdByCode).toHaveBeenCalledWith("1234", companyId);
  });

  test("returns the matched seller id when seller is enabled", async () => {
    const isFeatureEnabled = vi.fn(async () => true);
    const findActiveSellerIdByCode = vi.fn(async () => "seller-1");

    const result = await resolveOrderSellerId(
      { companyId, sellerCode: " 1234 " },
      { isFeatureEnabled, findActiveSellerIdByCode },
    );

    expect(result).toEqual({ success: true, data: "seller-1" });
    expect(findActiveSellerIdByCode).toHaveBeenCalledWith("1234", companyId);
  });
});
