-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isPackage" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PackageItem" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "childProductId" TEXT NOT NULL,
    "parentProductId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_childProductId_fkey" FOREIGN KEY ("childProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_parentProductId_fkey" FOREIGN KEY ("parentProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
