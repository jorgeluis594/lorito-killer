/*
  Warnings:

  - You are about to drop the column `broadcastTime` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `observations` on the `Document` table. All the data in the column will be lost.
  - Changed the type of `dateOfIssue` on the `Document` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "broadcastTime",
DROP COLUMN "observations",
DROP COLUMN "dateOfIssue",
ADD COLUMN     "dateOfIssue" TIMESTAMP(3) NOT NULL;
