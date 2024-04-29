-- AlterTable
ALTER TABLE "CashShift" ADD COLUMN     "companyId" TEXT;

-- AddForeignKey
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
