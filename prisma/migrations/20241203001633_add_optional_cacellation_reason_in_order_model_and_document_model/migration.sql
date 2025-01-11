-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "cancellationReason" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "cancellationReason" DROP NOT NULL;
