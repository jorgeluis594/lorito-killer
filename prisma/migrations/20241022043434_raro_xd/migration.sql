/*
  Warnings:

  - Made the column `netTotal` on table `Order` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "discountAmount" DROP DEFAULT,
ALTER COLUMN "netTotal" SET NOT NULL;
