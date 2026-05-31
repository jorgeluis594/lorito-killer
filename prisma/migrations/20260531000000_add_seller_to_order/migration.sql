-- AlterTable
ALTER TABLE "Order" ADD COLUMN "sellerId" TEXT;

-- CreateIndex
CREATE INDEX "Order_companyId_sellerId_idx" ON "Order"("companyId", "sellerId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
