CREATE TYPE "KitchenTicketPrintJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED');

CREATE TABLE "OrderRound" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "responsibleUserId" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "tableSessionId" TEXT,
  "draftRevision" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderRoundItem" (
  "id" TEXT NOT NULL,
  "orderRoundId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL,
  "notes" TEXT,
  "kitchenId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderRoundItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchenTicket" (
  "id" TEXT NOT NULL,
  "orderRoundId" TEXT NOT NULL,
  "kitchenId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KitchenTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchetTicketPrintJob" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "kitchenTicketId" TEXT NOT NULL,
  "printerId" TEXT NOT NULL,
  "content" BYTEA NOT NULL,
  "isReprint" BOOLEAN NOT NULL DEFAULT false,
  "requestedById" TEXT NOT NULL,
  "status" "KitchenTicketPrintJobStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "claimRequestedAt" TIMESTAMP(3),
  "processingStartedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KitchetTicketPrintJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderRound_orderId_number_key" ON "OrderRound"("orderId", "number");
CREATE UNIQUE INDEX "OrderRound_tableSessionId_draftRevision_key" ON "OrderRound"("tableSessionId", "draftRevision");
CREATE INDEX "OrderRound_orderId_createdAt_idx" ON "OrderRound"("orderId", "createdAt");
CREATE UNIQUE INDEX "OrderRoundItem_orderItemId_key" ON "OrderRoundItem"("orderItemId");
CREATE INDEX "OrderRoundItem_orderRoundId_kitchenId_idx" ON "OrderRoundItem"("orderRoundId", "kitchenId");
CREATE UNIQUE INDEX "KitchenTicket_orderRoundId_kitchenId_key" ON "KitchenTicket"("orderRoundId", "kitchenId");
CREATE INDEX "KitchenTicket_kitchenId_createdAt_idx" ON "KitchenTicket"("kitchenId", "createdAt");
CREATE INDEX "KitchetTicketPrintJob_companyId_status_nextAttemptAt_idx" ON "KitchetTicketPrintJob"("companyId", "status", "nextAttemptAt");
CREATE INDEX "KitchetTicketPrintJob_kitchenTicketId_createdAt_idx" ON "KitchetTicketPrintJob"("kitchenTicketId", "createdAt");

ALTER TABLE "OrderRound" ADD CONSTRAINT "OrderRound_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderRound" ADD CONSTRAINT "OrderRound_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderRoundItem" ADD CONSTRAINT "OrderRoundItem_orderRoundId_fkey" FOREIGN KEY ("orderRoundId") REFERENCES "OrderRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderRoundItem" ADD CONSTRAINT "OrderRoundItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderRoundItem" ADD CONSTRAINT "OrderRoundItem_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "Kitchen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_orderRoundId_fkey" FOREIGN KEY ("orderRoundId") REFERENCES "OrderRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "Kitchen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchetTicketPrintJob" ADD CONSTRAINT "KitchetTicketPrintJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchetTicketPrintJob" ADD CONSTRAINT "KitchetTicketPrintJob_kitchenTicketId_fkey" FOREIGN KEY ("kitchenTicketId") REFERENCES "KitchenTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchetTicketPrintJob" ADD CONSTRAINT "KitchetTicketPrintJob_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchetTicketPrintJob" ADD CONSTRAINT "KitchetTicketPrintJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
