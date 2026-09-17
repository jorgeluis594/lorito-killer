CREATE TYPE "KitchenStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TYPE "ProductType" ADD VALUE 'DISH';

CREATE TABLE "Kitchen" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "KitchenStatus" NOT NULL DEFAULT 'ACTIVE',
    "printerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Kitchen_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Product" ADD COLUMN "kitchenId" TEXT;

CREATE UNIQUE INDEX "Kitchen_printerId_key" ON "Kitchen"("printerId");
CREATE INDEX "Kitchen_companyId_idx" ON "Kitchen"("companyId");
CREATE INDEX "Product_kitchenId_idx" ON "Product"("kitchenId");

ALTER TABLE "Kitchen" ADD CONSTRAINT "Kitchen_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Kitchen" ADD CONSTRAINT "Kitchen_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "Kitchen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
