import { broadcast } from "@/lib/realtime/broadcast";
import { getRealtimeProvider } from "@/lib/realtime/config";

export const requestPrinterInventory = async (printClientId: string) =>
  (await getRealtimeProvider()).broadcast(
    `print-client:${printClientId}`,
    "REFRESH_PRINTER_INVENTORY",
    { type: "REFRESH_PRINTER_INVENTORY", version: 1 },
  );

export const notifyKitchenChanged = (
  companyId: string,
  event: "printer-inventory-updated" | "print-job-changed",
) => broadcast(companyId, "kitchen", event, {});
