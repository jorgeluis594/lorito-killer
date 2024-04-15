/*
  Warnings:

  - Added the required column `userId` to the `CashShift` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CashShift" ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "finalAmount" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
