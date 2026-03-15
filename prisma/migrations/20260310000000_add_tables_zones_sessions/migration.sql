-- CreateEnum
CREATE TYPE "TableSessionStatus" AS ENUM ('OPEN', 'BILL_REQUESTED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('RETAIL', 'DINE_IN', 'TAKE_AWAY', 'DELIVERY');

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "cashShiftId" DROP NOT NULL;
ALTER TABLE "Order" ADD COLUMN "orderType" "OrderType" NOT NULL DEFAULT 'RETAIL';
ALTER TABLE "Order" ADD COLUMN "tableSessionId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "notes" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "round" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "zoneId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableSession" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "waiterId" TEXT NOT NULL,
    "status" "TableSessionStatus" NOT NULL DEFAULT 'OPEN',
    "current" BOOLEAN DEFAULT true,
    "guestCount" INTEGER,
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Zone_companyId_idx" ON "Zone"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_companyId_name_key" ON "Zone"("companyId", "name");

-- CreateIndex
CREATE INDEX "Table_companyId_idx" ON "Table"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Table_companyId_number_key" ON "Table"("companyId", "number");

-- CreateIndex
CREATE INDEX "TableSession_companyId_status_idx" ON "TableSession"("companyId", "status");

-- CreateIndex
CREATE INDEX "TableSession_tableId_status_idx" ON "TableSession"("tableId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TableSession_tableId_current_key" ON "TableSession"("tableId", "current");

-- CreateIndex
CREATE UNIQUE INDEX "Order_tableSessionId_key" ON "Order"("tableSessionId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tableSessionId_fkey" FOREIGN KEY ("tableSessionId") REFERENCES "TableSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSession" ADD CONSTRAINT "TableSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSession" ADD CONSTRAINT "TableSession_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSession" ADD CONSTRAINT "TableSession_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
