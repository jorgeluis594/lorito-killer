/*
  Warnings:

  - Added the required column `netTotal` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Made the column `discountAmount` on table `Order` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "netTotal" DECIMAL(65,30) NOT NULL,
ALTER COLUMN "discountAmount" SET NOT NULL;
