ALTER TABLE "Company" ADD COLUMN "cashierPrinterId" TEXT;

CREATE UNIQUE INDEX "Company_cashierPrinterId_key" ON "Company"("cashierPrinterId");

ALTER TABLE "Company" ADD CONSTRAINT "Company_cashierPrinterId_fkey" FOREIGN KEY ("cashierPrinterId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
