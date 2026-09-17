import { describe, expect, test, vi } from "vitest";
import { checkKitchenPrinters } from "../use-cases/check-kitchen-printers";

const now = new Date("2026-09-15T12:00:00Z");

describe("checkKitchenPrinters", () => {
  test("flags missing and stale printers and requests one inventory per client", async () => {
    const find = vi.fn().mockResolvedValue([
      {
        id: "missing",
        name: "Cocina",
        printClientId: "client-1",
        lastDetectedAt: new Date("2026-09-15T11:59:59Z"),
        lastInventoryAt: now,
        lastDeliveredAt: now,
      },
      {
        id: "stale",
        name: "Barra",
        printClientId: "client-1",
        lastDetectedAt: new Date("2026-09-15T11:54:59Z"),
        lastInventoryAt: new Date("2026-09-15T11:54:59Z"),
        lastDeliveredAt: null,
      },
      {
        id: "recent",
        name: "Fríos",
        printClientId: "client-2",
        lastDetectedAt: new Date("2026-09-15T11:55:00Z"),
        lastInventoryAt: new Date("2026-09-15T11:55:00Z"),
        lastDeliveredAt: null,
      },
    ]);
    const request = vi.fn().mockResolvedValue(undefined);

    const result = await checkKitchenPrinters(
      { companyId: "company-1", now, staleAfterMs: 300000 },
      find,
      request,
    );

    expect(result).toEqual([
      expect.objectContaining({
        id: "missing",
        reason: "MISSING_FROM_INVENTORY",
      }),
      expect.objectContaining({ id: "stale", reason: "STALE_ACTIVITY" }),
    ]);
    expect(find).toHaveBeenCalledWith("company-1");
    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith("client-1");
  });

  test("uses the newest delivered or detected activity and treats missing dates as absent", async () => {
    const find = vi.fn().mockResolvedValue([
      {
        id: "delivered",
        name: "Cocina",
        printClientId: "client-1",
        lastDetectedAt: new Date("2026-09-15T11:50:00Z"),
        lastInventoryAt: new Date("2026-09-15T11:50:00Z"),
        lastDeliveredAt: new Date("2026-09-15T11:59:00Z"),
      },
      {
        id: "unknown",
        name: "Barra",
        printClientId: "client-2",
        lastDetectedAt: null,
        lastInventoryAt: null,
        lastDeliveredAt: now,
      },
    ]);

    const result = await checkKitchenPrinters(
      { companyId: "company-1", now, staleAfterMs: 300000 },
      find,
      vi.fn().mockResolvedValue(undefined),
    );

    expect(result.map(({ id }) => id)).toEqual(["unknown"]);
  });

  test("keeps the warning visible when Realtime cannot request inventory", async () => {
    const find = vi.fn().mockResolvedValue([
      {
        id: "missing",
        name: "Cocina",
        printClientId: "client-1",
        lastDetectedAt: null,
        lastInventoryAt: null,
        lastDeliveredAt: null,
      },
    ]);

    const result = await checkKitchenPrinters(
      { companyId: "company-1", now, staleAfterMs: 300000 },
      find,
      vi.fn().mockRejectedValue(new Error("Realtime unavailable")),
    );

    expect(result).toEqual([
      expect.objectContaining({
        id: "missing",
        reason: "MISSING_FROM_INVENTORY",
      }),
    ]);
  });
});
