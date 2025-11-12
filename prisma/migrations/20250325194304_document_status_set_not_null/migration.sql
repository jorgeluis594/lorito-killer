/*
  Warnings:

  - Made the column `status` on table `Document` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;
