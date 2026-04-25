import { Queue, type JobsOptions, type QueueOptions } from "bullmq";
import { connection } from "@/lib/queue/connection";

const defaultJobOptions: JobsOptions = {
  attempts: 4,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

export function createAppQueue<DataType>(
  name: string,
  options?: Omit<QueueOptions, "connection">,
) {
  return new Queue<DataType>(name, {
    ...options,
    connection,
    defaultJobOptions: {
      ...defaultJobOptions,
      ...options?.defaultJobOptions,
    },
  });
}
