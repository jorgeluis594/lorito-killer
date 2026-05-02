import { type Queue, type Worker } from "bullmq";

export interface QueueModule {
  name: string;
  queues: Queue[];
  createWorkers: Array<() => Worker>;
}
