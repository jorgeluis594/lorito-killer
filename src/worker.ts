import { log } from "@/lib/log";
import { documentJobs } from "@/document/jobs";
import { reconcilePendingDocumentTaxDispatches } from "@/document/tax-dispatch-outbox";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import express from "express";

log.info("worker_starting", { pid: process.pid });

const queueModules = [documentJobs];
const workers = queueModules.flatMap((queueModule) =>
  queueModule.createWorkers.map((createWorker) => createWorker()),
);

const configuredTaxDispatchReconcileInterval = Number(
  process.env.DOCUMENT_TAX_DISPATCH_RECONCILE_INTERVAL_MS,
);
const TAX_DISPATCH_RECONCILE_INTERVAL_MS =
  Number.isFinite(configuredTaxDispatchReconcileInterval) &&
  configuredTaxDispatchReconcileInterval > 0
    ? configuredTaxDispatchReconcileInterval
    : 60000;

let taxDispatchReconcileRunning = false;

async function reconcileTaxDispatches() {
  if (taxDispatchReconcileRunning) {
    return;
  }

  taxDispatchReconcileRunning = true;
  try {
    await reconcilePendingDocumentTaxDispatches();
  } catch (error) {
    log.error("document_tax_dispatch_reconcile_failed", { error });
  } finally {
    taxDispatchReconcileRunning = false;
  }
}

void reconcileTaxDispatches();
const taxDispatchReconcileInterval = setInterval(
  reconcileTaxDispatches,
  TAX_DISPATCH_RECONCILE_INTERVAL_MS,
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
  clearInterval(taxDispatchReconcileInterval);
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

log.info("worker_started", {
  pid: process.pid,
  queues: queueModules.map((queueModule) => queueModule.name),
});
