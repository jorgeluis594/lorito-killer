import { describe, expect, test, vi } from "vitest";
import { createPrintClientLinkCode } from "../use-cases/create-print-client-link-code";
import { linkPrintClient } from "../use-cases/link-print-client";
import { registerPrinterInventory } from "../use-cases/register-printer-inventory";

const now = new Date("2026-09-15T12:00:00.000Z");

describe("print client linking", () => {
  test("preserves leading zeros and expires a code after ten minutes", async () => {
    const createCode = vi.fn().mockResolvedValue(true);
    const result = await createPrintClientLinkCode(
      {
        createCode,
        generateCode: () => "0047",
        hashCode: (code) => `hash:${code}`,
        now: () => now,
      },
      { companyId: "company-1", createdById: "admin-1" },
    );

    expect(result).toEqual({
      success: true,
      data: { code: "0047", expiresAt: new Date("2026-09-15T12:10:00.000Z") },
    });
    expect(createCode).toHaveBeenCalledWith(
      expect.objectContaining({ codeHash: "hash:0047" }),
    );
  });

  test("retries a live hash collision", async () => {
    const createCode = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const codes = ["1111", "2222"];
    const result = await createPrintClientLinkCode(
      {
        createCode,
        generateCode: () => codes.shift()!,
        hashCode: (code) => code,
        now: () => now,
      },
      { companyId: "company-1", createdById: "admin-1" },
    );
    expect(result.success && result.data.code).toBe("2222");
    expect(createCode).toHaveBeenCalledTimes(2);
  });

  test("returns the credential once and persists only its hash", async () => {
    const consumeCode = vi
      .fn()
      .mockResolvedValue({
        id: "client-1",
        companyId: "company-1",
        companyName: "Mi negocio",
      });
    const result = await linkPrintClient(
      {
        consumeCode,
        createCredential: () => "lpk_secret",
        hashCode: (value) => `code:${value}`,
        hashCredential: (value) => `credential:${value}`,
        now: () => now,
      },
      { code: "0047", machineName: "CAJA-01" },
    );
    expect(result).toEqual({
      success: true,
      data: {
        id: "client-1",
        companyId: "company-1",
        companyName: "Mi negocio",
        credential: "lpk_secret",
      },
    });
    expect(consumeCode).toHaveBeenCalledWith({
      codeHash: "code:0047",
      credentialHash: "credential:lpk_secret",
      machineName: "CAJA-01",
      now,
    });
  });

  test("uses the same rejection for an unknown, used, or expired code", async () => {
    const result = await linkPrintClient(
      {
        consumeCode: vi.fn().mockResolvedValue(undefined),
        createCredential: () => "lpk_secret",
        hashCode: (value) => value,
        hashCredential: (value) => value,
        now: () => now,
      },
      { code: "9999", machineName: "CAJA-01" },
    );
    expect(result).toEqual({
      success: false,
      message: "Codigo invalido o vencido",
    });
  });
});

describe("printer inventory", () => {
  test("deduplicates queues and uses one timestamp for the complete inventory", async () => {
    const registerInventory = vi.fn().mockResolvedValue(true);
    const result = await registerPrinterInventory(
      { registerInventory, now: () => now },
      { id: "client-1", companyId: "company-1" },
      {
        version: 1,
        printers: [
          { localName: "COCINA" },
          { localName: "COCINA" },
          { localName: "BAR" },
        ],
      },
    );
    expect(registerInventory).toHaveBeenCalledWith(
      { id: "client-1", companyId: "company-1" },
      ["COCINA", "BAR"],
      now,
    );
    expect(result).toEqual({
      success: true,
      data: { registered: 2, lastInventoryAt: now },
    });
  });

  test("accepts an empty complete inventory", async () => {
    const registerInventory = vi.fn().mockResolvedValue(true);
    const result = await registerPrinterInventory(
      { registerInventory, now: () => now },
      { id: "client-1", companyId: "company-1" },
      { version: 1, printers: [] },
    );
    expect(registerInventory).toHaveBeenCalledWith(expect.anything(), [], now);
    expect(result.success).toBe(true);
  });

  test("rejects inventory when the client was revoked concurrently", async () => {
    const result = await registerPrinterInventory(
      { registerInventory: vi.fn().mockResolvedValue(false), now: () => now },
      { id: "client-1", companyId: "company-1" },
      { version: 1, printers: [{ localName: "COCINA" }] },
    );
    expect(result).toEqual({ success: false, message: "Credencial invalida" });
  });
});
