/*
  Warnings:

  - Added the required column `cancellationReason` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN "cancellationReason" TEXT;

UPDATE "Order" SET "cancellationReason" = '' WHERE "status" = 'CANCELLED';