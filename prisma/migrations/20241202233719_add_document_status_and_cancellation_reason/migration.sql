/*
  Warnings:

  - Added the required column `cancellationReason` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('REGISTERED', 'CANCELLED', 'PENDING_CANCELLATION');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "status" "DocumentStatus" DEFAULT 'REGISTERED';