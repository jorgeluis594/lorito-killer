/*
  Warnings:

  - You are about to drop the column `fromProductId` on the `StockTransfer` table. All the data in the column will be lost.
  - You are about to drop the column `orderItemId` on the `StockTransfer` table. All the data in the column will be lost.
  - You are about to drop the column `toProductId` on the `StockTransfer` table. All the data in the column will be lost.
  - Added the required column `data` to the `StockTransfer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `StockTransfer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StockTransfer" DROP COLUMN "fromProductId",
DROP COLUMN "orderItemId",
DROP COLUMN "toProductId",
ADD COLUMN     "data" JSONB NOT NULL,
ADD COLUMN     "productId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
