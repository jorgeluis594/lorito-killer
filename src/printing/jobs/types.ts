import type { Prisma, PrintJobSourceType } from "@prisma/client";
import type { PrinterProfile } from "@/printing/clients/types";

export type { PrintJobSourceType };

export type PrintJobStatus = "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED";

export type PrintJob = {
  id: string;
  companyId: string;
  sourceType: PrintJobSourceType;
  sourceId: string;
  printerId: string;
  printClientId: string;
  printerLocalName: string;
  status: PrintJobStatus;
  attempts: number;
  nextAttemptAt: Date | null;
  claimRequestedAt: Date | null;
  processingStartedAt: Date | null;
};

export type PrintRecoveryPolicy = {
  timeoutMs: number;
  maxAttempts: number;
  retryDelaysMs: number[];
};

export type PrintAttempt = {
  jobId: string;
  attemptNumber: number;
  printerId: string;
  printerLocalName: string;
  timeoutMs: number;
  attemptExpiresAt: Date;
  serverNow: Date;
};

export type PrintResult = "DELIVERED" | "RETRYABLE_FAILURE" | "FAILED";

export type PrintJobPrinter = Pick<
  PrinterProfile,
  "columns" | "cutEnabled" | "feedBeforeCut"
> & { codepageMapping: string };

export type PrintJobStrategy<Snapshot> = {
  /** Si se omite, PRINT_JOB_MAX_ATTEMPTS. */
  maxAttempts?: number;
  buildSnapshot(
    db: Prisma.TransactionClient,
    companyId: string,
    sourceId: string,
    options?: { isReprint?: boolean },
  ): Promise<Snapshot>;
  render(snapshot: Snapshot, printer: PrintJobPrinter): Promise<Uint8Array>;
  failureAudience(job: {
    companyId: string;
    sourceId: string;
    requestedById: string;
  }): Promise<{ channels: string[] }>;
};
