-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('PENDING', 'EXECUTED', 'ROLLED_BACK');

-- AlterTable
ALTER TABLE "StockTransfer" ADD COLUMN     "status" "StockTransferStatus";

-- Set type as EXECUTED for all existing rows
UPDATE "StockTransfer" SET "status" = 'EXECUTED';

-- Set not null and default value as pending
ALTER TABLE "StockTransfer" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "StockTransfer" ALTER COLUMN "status" SET DEFAULT 'PENDING';
