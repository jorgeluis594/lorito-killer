-- AlterTable
ALTER TABLE "KitchetTicketPrintJob" ADD COLUMN "ticket" JSONB,
ALTER COLUMN "content" DROP NOT NULL;
