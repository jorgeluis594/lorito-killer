/*
  Warnings:

  - Added the required column `documentNumeral` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `documentType` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "documentNumeral" TEXT NOT NULL,
ADD COLUMN     "documentType" TEXT NOT NULL;
