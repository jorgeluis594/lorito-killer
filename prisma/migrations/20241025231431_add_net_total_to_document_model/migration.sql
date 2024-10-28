/*
  Warnings:

  - Added the required column `netTotal` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "netTotal" DECIMAL(65,30);
UPDATE "Document" SET "netTotal" = "total" - "discountAmount";
ALTER TABLE "Document" ALTER COLUMN "discountAmount" SET NOT NULL;