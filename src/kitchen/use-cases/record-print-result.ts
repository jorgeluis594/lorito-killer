import type { response } from "@/lib/types";
import type { PrintJob, PrintRecoveryPolicy, PrintResult } from "../types";

type Dependencies = {
  findJob: (jobId: string) => Promise<PrintJob | null>;
  record: (input: {
    jobId: string;
    clientId: string;
    attemptNumber: number;
    status: "PENDING" | "DELIVERED" | "FAILED";
    nextAttemptAt: Date | null;
    error: string | null;
  }) => Promise<PrintJob | null>;
};

export async function recordPrintResult(
  dependencies: Dependencies,
  input: {
    jobId: string;
    clientId: string;
    companyId: string;
    attemptNumber: number;
    result: PrintResult;
    error?: string;
    now: Date;
  },
  policy: PrintRecoveryPolicy,
): Promise<response<PrintJob & { applied: boolean }>> {
  const job = await dependencies.findJob(input.jobId);
  if (
    !job ||
    job.companyId !== input.companyId ||
    job.printClientId !== input.clientId
  )
    return { success: false, message: "Trabajo no disponible" };

  if (job.attempts !== input.attemptNumber)
    return { success: false, message: "Intento desactualizado" };
  if (job.status !== "PROCESSING")
    return job.status === "PENDING" ||
      job.status === "DELIVERED" ||
      job.status === "FAILED"
      ? { success: true, data: { ...job, applied: false } }
      : { success: false, message: "Intento no disponible" };

  const retriesRemain = job.attempts < policy.maxAttempts;
  const retryDelay = policy.retryDelaysMs[job.attempts - 1];
  const retry =
    input.result === "RETRYABLE_FAILURE" &&
    retriesRemain &&
    retryDelay !== undefined;
  const status =
    input.result === "DELIVERED" ? "DELIVERED" : retry ? "PENDING" : "FAILED";
  const recorded = await dependencies.record({
    jobId: job.id,
    clientId: input.clientId,
    attemptNumber: input.attemptNumber,
    status,
    nextAttemptAt: retry ? new Date(input.now.getTime() + retryDelay) : null,
    error:
      status === "DELIVERED"
        ? null
        : input.error ||
          (input.result === "RETRYABLE_FAILURE"
            ? "Se agotaron los intentos de impresión"
            : "El cliente no pudo confirmar la impresión"),
  });
  return recorded
    ? { success: true, data: { ...recorded, applied: true } }
    : { success: false, message: "Intento no disponible" };
}
