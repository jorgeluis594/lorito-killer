/*
  Warnings:

  - You are about to drop the column `companyId` on the `StockTransfer` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "StockTransfer" DROP CONSTRAINT "StockTransfer_companyId_fkey";

-- AlterTable
ALTER TABLE "StockTransfer" DROP COLUMN "companyId";
