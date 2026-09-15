import { broadcast } from "@/lib/realtime/broadcast";
import { getRealtimeProvider } from "@/lib/realtime/config";
import { findPrintJobFailureAudience } from "./db_repository";

export const notifyPrintJobAvailable = async (
  printClientId: string,
  jobId: string,
) =>
  (await getRealtimeProvider()).broadcast(
    `print-client:${printClientId}`,
    "PRINT_JOB_AVAILABLE",
    { type: "PRINT_JOB_AVAILABLE", version: 1, jobId },
  );

export const notifyPrintJobFailed = async (jobId: string) => {
  const audience = await findPrintJobFailureAudience(jobId);
  if (!audience) return;
  await Promise.all([
    broadcast(audience.companyId, "kitchen-admin", "print-job-failed", {}),
    broadcast(
      audience.companyId,
      `kitchen-user-${audience.kitchenTicket.orderRound.responsibleUserId}`,
      "print-job-failed",
      {},
    ),
  ]);
};

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
