import type { response } from "@/lib/types";
import type { PrintJob, PrintJobStatus } from "../types";

type Dependencies = {
  failTimedOut: (input: {
    jobId: string;
    status: PrintJobStatus;
    observedAt: Date;
    error: string;
  }) => Promise<PrintJob | null>;
};

export async function recordPrintTimeout(
  dependencies: Dependencies,
  input: {
    jobId: string;
    status: "PENDING" | "PROCESSING";
    observedAt: Date;
    now: Date;
    timeoutMs: number;
  },
): Promise<response<PrintJob | null>> {
  if (input.observedAt.getTime() + input.timeoutMs > input.now.getTime())
    return { success: true, data: null };
  return {
    success: true,
    data: await dependencies.failTimedOut({
      jobId: input.jobId,
      status: input.status,
      observedAt: input.observedAt,
      error:
        input.status === "PENDING"
          ? "El cliente no reclamó el trabajo a tiempo"
          : "El cliente no informó el resultado a tiempo",
    }),
  };
}
