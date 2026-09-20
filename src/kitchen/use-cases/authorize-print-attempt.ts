import type { response } from "@/lib/types";
import type { PrintAttempt, PrintJob, PrintRecoveryPolicy } from "../types";

type Dependencies = {
  findJob: (jobId: string) => Promise<PrintJob | null>;
  authorize: (input: {
    jobId: string;
    clientId: string;
    expectedClaimRequestedAt: Date;
    now: Date;
  }) => Promise<PrintJob | null>;
};

const attempt = (job: PrintJob, timeoutMs: number, serverNow: Date): PrintAttempt => ({
  jobId: job.id,
  attemptNumber: job.attempts,
  printerId: job.printerId,
  printerLocalName: job.printerLocalName,
  content: job.content,
  timeoutMs,
  attemptExpiresAt: new Date((job.processingStartedAt ?? serverNow).getTime() + timeoutMs),
  serverNow,
});

export async function authorizePrintAttempt(
  dependencies: Dependencies,
  input: { jobId: string; clientId: string; companyId: string; now: Date },
  policy: PrintRecoveryPolicy,
): Promise<response<PrintAttempt>> {
  const job = await dependencies.findJob(input.jobId);
  if (
    !job ||
    job.companyId !== input.companyId ||
    job.printClientId !== input.clientId
  )
    return { success: false, message: "Trabajo no disponible" };

  if (job.status === "PROCESSING" && job.processingStartedAt)
    return job.processingStartedAt.getTime() + policy.timeoutMs >
      input.now.getTime()
      ? { success: true, data: attempt(job, policy.timeoutMs, input.now) }
      : { success: false, message: "Trabajo no disponible" };
  if (
    job.status !== "PENDING" ||
    !job.claimRequestedAt ||
    job.claimRequestedAt.getTime() + policy.timeoutMs <= input.now.getTime() ||
    (job.nextAttemptAt && job.nextAttemptAt > input.now) ||
    job.attempts >= policy.maxAttempts
  )
    return { success: false, message: "Trabajo no disponible" };

  const authorized = await dependencies.authorize({
    jobId: job.id,
    clientId: input.clientId,
    expectedClaimRequestedAt: job.claimRequestedAt,
    now: input.now,
  });
  return authorized
    ? { success: true, data: attempt(authorized, policy.timeoutMs, input.now) }
    : { success: false, message: "Trabajo no disponible" };
}
