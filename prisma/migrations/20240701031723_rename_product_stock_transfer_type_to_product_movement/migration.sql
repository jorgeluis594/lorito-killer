/*
  Warnings:

  - The values [PRODUCT] on the enum `StockTransferType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StockTransferType_new" AS ENUM ('ORDER', 'ADJUSTMENT', 'PRODUCT_MOVEMENT');
ALTER TABLE "StockTransfer" ALTER COLUMN "type" TYPE "StockTransferType_new" USING ("type"::text::"StockTransferType_new");
ALTER TYPE "StockTransferType" RENAME TO "StockTransferType_old";
ALTER TYPE "StockTransferType_new" RENAME TO "StockTransferType";
DROP TYPE "StockTransferType_old";
COMMIT;
