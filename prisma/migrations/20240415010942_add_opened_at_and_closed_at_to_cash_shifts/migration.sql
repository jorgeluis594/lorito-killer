/*
  Warnings:

  - Added the required column `openedAt` to the `CashShift` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CashShift" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "openedAt" TIMESTAMP(3) NOT NULL;
