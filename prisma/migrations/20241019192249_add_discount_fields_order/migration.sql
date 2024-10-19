/*
  Warnings:

  - You are about to drop the column `discount` on the `Order` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('AMOUNT', 'PERCENT');

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "discount",
ADD COLUMN     "discountAmount" DECIMAL(65,30),
ADD COLUMN     "discountType" "DiscountType",
ADD COLUMN     "discountValue" DECIMAL(65,30);
