import type { PrintRecoveryPolicy } from "./types";

const positiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getPrintRecoveryPolicy = (): PrintRecoveryPolicy => ({
  timeoutMs: positiveNumber(process.env.PRINT_JOB_TIMEOUT_MS, 10000),
  maxAttempts: Math.floor(
    positiveNumber(process.env.PRINT_JOB_MAX_ATTEMPTS, 4),
  ),
  retryDelaysMs: (process.env.PRINT_JOB_RETRY_DELAYS_MS || "5000,15000,30000")
    .split(",")
    .map(Number)
    .filter((delay) => Number.isFinite(delay) && delay >= 0),
});
