/*
  Warnings:

  - You are about to drop the column `orderId` on the `Customer` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_orderId_fkey";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "orderId";
