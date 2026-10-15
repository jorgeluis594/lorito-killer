ALTER TABLE "Company" ADD COLUMN "invoicePrinterId" TEXT;

CREATE UNIQUE INDEX "Company_invoicePrinterId_key" ON "Company"("invoicePrinterId");

ALTER TABLE "Company" ADD CONSTRAINT "Company_invoicePrinterId_fkey" FOREIGN KEY ("invoicePrinterId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
