import type { KitchenPrinterAttention } from "../types";

export type KitchenPrinterActivity = {
  id: string;
  name: string;
  printClientId: string;
  lastDetectedAt: Date | null;
  lastInventoryAt: Date | null;
  lastDeliveredAt: Date | null;
};

export async function checkKitchenPrinters(
  input: { companyId: string; now: Date; staleAfterMs: number },
  find: (companyId: string) => Promise<KitchenPrinterActivity[]>,
  requestInventory: (printClientId: string) => Promise<void>,
): Promise<KitchenPrinterAttention[]> {
  const printers = await find(input.companyId);
  const cutoff = input.now.getTime() - input.staleAfterMs;
  const attention = printers.flatMap((printer) => {
    const missing =
      !printer.lastDetectedAt ||
      !printer.lastInventoryAt ||
      printer.lastDetectedAt < printer.lastInventoryAt;
    const latest = Math.max(
      printer.lastDetectedAt?.getTime() ?? 0,
      printer.lastDeliveredAt?.getTime() ?? 0,
    );
    if (!missing && latest >= cutoff) return [];
    return [
      {
        id: printer.id,
        name: printer.name,
        printClientId: printer.printClientId,
        reason: missing ? "MISSING_FROM_INVENTORY" : "STALE_ACTIVITY",
      } satisfies KitchenPrinterAttention,
    ];
  });
  await Promise.allSettled(
    [...new Set(attention.map(({ printClientId }) => printClientId))].map(
      (printClientId) => requestInventory(printClientId),
    ),
  );
  return attention;
}
