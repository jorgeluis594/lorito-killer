ALTER TYPE "UserRole" ADD VALUE 'SELLER';

ALTER TABLE "User" ADD COLUMN "sellerCode" TEXT;

CREATE UNIQUE INDEX "User_companyId_sellerCode_key" ON "User"("companyId", "sellerCode");
