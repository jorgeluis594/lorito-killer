import { type Job, Worker, type WorkerOptions } from "bullmq";
import { log } from "@/lib/log";
import { connection } from "@/lib/queue/connection";

type JobLogContext<DataType> = (job: Job<DataType>) => Record<string, unknown>;

interface CreateAppWorkerOptions<DataType>
  extends Omit<WorkerOptions, "connection"> {
  logContext?: JobLogContext<DataType>;
}

const defaultConcurrency = 5;

export function createAppWorker<DataType>(
  queueName: string,
  processor: (job: Job<DataType>) => Promise<unknown>,
  options: CreateAppWorkerOptions<DataType> = {},
) {
  const { logContext, ...workerOptions } = options;
  const worker = new Worker<DataType>(queueName, processor, {
    ...workerOptions,
    connection,
    concurrency: workerOptions.concurrency ?? defaultConcurrency,
  });

  worker.on("completed", (job) => {
    log.info("job_completed", {
      queueName,
      jobId: job.id,
      jobName: job.name,
      ...logContext?.(job),
    });
  });

  worker.on("failed", (job, err) => {
    log.error("job_failed", {
      queueName,
      jobId: job?.id,
      jobName: job?.name,
      error: err.message,
      attempt: job?.attemptsMade,
      ...(job ? logContext?.(job) : {}),
    });
  });

  worker.on("error", (err) => {
    log.error("worker_error", { queueName, error: err.message });
  });

  return worker;
}
