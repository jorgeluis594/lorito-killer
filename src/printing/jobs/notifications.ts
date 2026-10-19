import { broadcast } from "@/lib/realtime/broadcast";
import { getRealtimeProvider } from "@/lib/realtime/config";
import { findPrintJobSource } from "./db_repository";
import { getPrintJobStrategy } from "./strategies";

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
  const job = await findPrintJobSource(jobId);
  if (!job) return;
  const { channels } = await getPrintJobStrategy(
    job.sourceType,
  ).failureAudience(job);
  await Promise.all(
    channels.map((channel) =>
      broadcast(job.companyId, channel, "print-job-failed", {}),
    ),
  );
};
