-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "issuedAt" TIMESTAMP(3),
ADD COLUMN     "issuedToTaxEntity" BOOLEAN NOT NULL DEFAULT false;
