import { log } from "@/lib/log";
import { createDocumentWorker } from "@/lib/queue/workers/document.worker";

log.info("worker_starting", { pid: process.pid });

const documentWorker = createDocumentWorker();

async function shutdown(signal: string) {
  log.info("worker_shutdown", { signal });
  await documentWorker.close();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

log.info("worker_started", { pid: process.pid, queues: ["document"] });
