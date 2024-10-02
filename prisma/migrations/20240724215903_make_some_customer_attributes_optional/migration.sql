/*
  Warnings:

  - You are about to drop the column `countryCode` on the `Customer` table. All the data in the column will be lost.
  - Changed the type of `documentType` on the `Customer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "CustomerDocumentType" AS ENUM ('RUC', 'DNI');

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "countryCode",
DROP COLUMN "documentType",
ADD COLUMN     "documentType" "CustomerDocumentType" NOT NULL,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "phoneNumber" DROP NOT NULL;
