/*
  Warnings:

  - Added the required column `netTotal` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "netTotal" DECIMAL(65,30);

-- Update existing rows to set netTotal before altering the column
UPDATE "Document" d
SET "netTotal" = o."netTotal"
FROM "Order" o
WHERE d."orderId" = o."id" AND d."netTotal" IS NULL;

ALTER TABLE "Document" ALTER COLUMN "netTotal" SET NOT NULL;
