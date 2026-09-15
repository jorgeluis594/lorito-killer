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
  await broadcast(audience.companyId, "kitchen", "print-job-failed", {
    jobId,
    responsibleUserId: audience.kitchenTicket.orderRound.responsibleUserId,
  });
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
