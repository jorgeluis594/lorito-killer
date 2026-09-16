import { log } from "@/lib/log";
import {
  failRevokedPrintJobs,
  failTimedOutPrintJob,
  findAnnouncedPrintJobs,
  findPrintJobTimeouts,
  reserveDuePrintJobs,
} from "./db_repository";
import { notifyPrintJobAvailable, notifyPrintJobFailed } from "./notifications";
import { getPrintRecoveryPolicy } from "./print-policy";
import { recordPrintTimeout } from "./use-cases/record-print-timeout";

export async function processPrintJobs(now = new Date()) {
  const revoked = await failRevokedPrintJobs(now);
  for (const jobId of revoked) {
    await notifyPrintJobFailed(jobId).catch((error) =>
      log.warn("print_job_failure_notification_failed", { jobId, error }),
    );
  }

  const policy = getPrintRecoveryPolicy();
  const cutoff = new Date(now.getTime() - policy.timeoutMs);
  const timedOut = await findPrintJobTimeouts(cutoff);
  for (const job of timedOut) {
    const status = job.status as "PENDING" | "PROCESSING";
    const observedAt =
      status === "PENDING" ? job.claimRequestedAt : job.processingStartedAt;
    if (!observedAt) continue;
    const result = await recordPrintTimeout(
      { failTimedOut: failTimedOutPrintJob },
      { jobId: job.id, status, observedAt, now, timeoutMs: policy.timeoutMs },
    );
    if (result.success && result.data)
      await notifyPrintJobFailed(job.id).catch((error) =>
        log.warn("print_job_failure_notification_failed", {
          jobId: job.id,
          error,
        }),
      );
  }

  const reserved = await reserveDuePrintJobs(now);
  const announced = await findAnnouncedPrintJobs(cutoff);
  await Promise.all(
    announced.map((job) =>
      notifyPrintJobAvailable(job.printer.printClientId, job.id).catch(
        (error) =>
          log.warn("print_job_available_notification_failed", {
            jobId: job.id,
            error,
          }),
      ),
    ),
  );
  return { timedOut: timedOut.length, reserved: reserved.length };
}
