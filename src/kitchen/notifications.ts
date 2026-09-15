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
