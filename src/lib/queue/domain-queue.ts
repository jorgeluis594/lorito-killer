import { type Job, type JobsOptions } from "bullmq";
import { createAppQueue } from "@/lib/queue/queue";
import { createAppWorker } from "@/lib/queue/worker";
import { type QueueModule } from "@/lib/queue/module";

type JobOptionsResolver<DataType> =
  | JobsOptions
  | ((data: DataType) => JobsOptions);

type DomainJobHandler<DataType> = (
  data: DataType,
  job: Job<DataType>,
) => Promise<unknown>;

interface DomainJobConfig<DataType> {
  idempotency?: (data: DataType) => string;
  options?: JobOptionsResolver<DataType>;
  logContext?: (
    data: DataType,
    job: Job<DataType>,
  ) => Record<string, unknown>;
}

interface RegisteredJob {
  handler: (job: Job<unknown>) => Promise<unknown>;
  logContext?: (job: Job<unknown>) => Record<string, unknown>;
}

function buildJobName(domainName: string, jobName: string) {
  const prefix = process.env.BULLMQ_JOB_PREFIX?.trim();
  return [prefix, domainName, jobName].filter(Boolean).join(":");
}

function resolveJobOptions<DataType>(
  options: DomainJobConfig<DataType>["options"],
  data: DataType,
) {
  return typeof options === "function" ? options(data) : options;
}

export function createDomainQueue(domainName: string) {
  const queue = createAppQueue<unknown>(domainName);
  const jobs: Record<string, RegisteredJob> = {};

  return {
    job<DataType>(
      jobName: string,
      config: DomainJobConfig<DataType>,
      handler: DomainJobHandler<DataType>,
    ) {
      const fullJobName = buildJobName(domainName, jobName);

      jobs[fullJobName] = {
        handler: (job) => handler(job.data as DataType, job as Job<DataType>),
        logContext: config.logContext
          ? (job) => config.logContext!(job.data as DataType, job as Job<DataType>)
          : undefined,
      };

      return {
        name: fullJobName,
        enqueue(data: DataType, options: JobsOptions = {}) {
          const configuredOptions = resolveJobOptions(config.options, data);
          const jobOptions = {
            ...configuredOptions,
            ...options,
          };

          if (!jobOptions.jobId && config.idempotency) {
            jobOptions.jobId = `${fullJobName}:${config.idempotency(data)}`;
          }

          return queue.add(fullJobName, data, jobOptions) as Promise<
            Job<DataType>
          >;
        },
      };
    },

    module(): QueueModule {
      return {
        name: domainName,
        queues: [queue],
        createWorkers: [
          () =>
            createAppWorker<unknown>(
              domainName,
              async (job) => {
                const registeredJob = jobs[job.name];

                if (!registeredJob) {
                  throw new Error(
                    `Unknown job "${job.name}" for queue "${domainName}"`,
                  );
                }

                return registeredJob.handler(job);
              },
              {
                logContext: (job) => jobs[job.name]?.logContext?.(job) ?? {},
              },
            ),
        ],
      };
    },
  };
}
