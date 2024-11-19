/*
  Warnings:

  - Changed the type of `status` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- First change the name of status column to status_old
ALTER TABLE "Order" RENAME COLUMN "status" TO "status_old";

-- Creates new column
ALTER TABLE "Order" ADD COLUMN "status" "OrderStatus";

-- Copy data from old column to new column using upper case
UPDATE "Order" SET "status" = UPPER("status_old")::text::"OrderStatus";

-- Drop old column
ALTER TABLE "Order" DROP COLUMN "status_old";

-- set new column as not null
ALTER TABLE "Order" ALTER COLUMN "status" SET NOT NULL;