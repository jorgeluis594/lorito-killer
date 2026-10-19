-- CreateEnum
CREATE TYPE "PrintJobSourceType" AS ENUM ('KITCHEN_TICKET', 'TAX_DOCUMENT', 'PRE_BILL');

-- La cola deja de apuntar solo a comandas: sourceId sin FK al origen.
ALTER TABLE "KitchetTicketPrintJob" DROP CONSTRAINT "KitchetTicketPrintJob_kitchenTicketId_fkey";
DROP INDEX "KitchetTicketPrintJob_kitchenTicketId_createdAt_idx";
ALTER TABLE "KitchetTicketPrintJob" RENAME COLUMN "kitchenTicketId" TO "sourceId";
ALTER TABLE "KitchetTicketPrintJob" ADD COLUMN "sourceType" "PrintJobSourceType" NOT NULL DEFAULT 'KITCHEN_TICKET';
ALTER TABLE "KitchetTicketPrintJob" ALTER COLUMN "sourceType" DROP DEFAULT;
CREATE INDEX "KitchetTicketPrintJob_sourceType_sourceId_createdAt_idx" ON "KitchetTicketPrintJob"("sourceType", "sourceId", "createdAt");

-- La impresora de comprobantes se une a la de caja.
UPDATE "Company" SET "cashierPrinterId" = "invoicePrinterId"
WHERE "cashierPrinterId" IS NULL AND "invoicePrinterId" IS NOT NULL;
ALTER TABLE "Company" DROP CONSTRAINT "Company_invoicePrinterId_fkey";
DROP INDEX "Company_invoicePrinterId_key";
ALTER TABLE "Company" DROP COLUMN "invoicePrinterId";
