CREATE INDEX "KitchetTicketPrintJob_status_nextAttemptAt_idx"
ON "KitchetTicketPrintJob"("status", "nextAttemptAt");

CREATE INDEX "KitchetTicketPrintJob_status_claimRequestedAt_idx"
ON "KitchetTicketPrintJob"("status", "claimRequestedAt");

CREATE INDEX "KitchetTicketPrintJob_status_processingStartedAt_idx"
ON "KitchetTicketPrintJob"("status", "processingStartedAt");

CREATE UNIQUE INDEX "KitchetTicketPrintJob_one_reserved_per_printer"
ON "KitchetTicketPrintJob"("printerId")
WHERE "status" = 'PROCESSING'
   OR ("status" = 'PENDING' AND "claimRequestedAt" IS NOT NULL);

CREATE UNIQUE INDEX "KitchetTicketPrintJob_one_active_per_ticket"
ON "KitchetTicketPrintJob"("kitchenTicketId")
WHERE "status" IN ('PENDING', 'PROCESSING');
