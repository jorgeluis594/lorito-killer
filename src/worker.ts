import { log } from "@/lib/log";
import { documentJobs } from "@/document/jobs";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import express from "express";

log.info("worker_starting", { pid: process.pid });

const queueModules = [documentJobs];
const workers = queueModules.flatMap((queueModule) =>
  queueModule.createWorkers.map((createWorker) => createWorker()),
);

// Bull Board dashboard
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/");

createBullBoard({
  queues: queueModules.flatMap((queueModule) =>
    queueModule.queues.map((queue) => new BullMQAdapter(queue)),
  ),
  serverAdapter,
});

const app = express();
app.use("/", serverAdapter.getRouter());

const BOARD_PORT = parseInt(process.env.BULL_BOARD_PORT || "3001", 10);
app.listen(BOARD_PORT, () => {
  log.info("bull_board_started", { port: BOARD_PORT });
});

async function shutdown(signal: string) {
  log.info("worker_shutdown", { signal });
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

log.info("worker_started", {
  pid: process.pid,
  queues: queueModules.map((queueModule) => queueModule.name),
});
