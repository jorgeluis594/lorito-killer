/*
  Warnings:

  - Added the required column `discountAmount` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `netTotal` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "discountAmount" DECIMAL(65,30),
ADD COLUMN     "discountType" "DiscountType",
ADD COLUMN     "discountValue" DECIMAL(65,30),
ADD COLUMN     "netTotal" DECIMAL(65,30);

-- Copy the total to netTotal and make netTotal not null
UPDATE "OrderItem" SET "netTotal" = "total";
ALTER TABLE "OrderItem" ALTER COLUMN "netTotal" SET NOT NULL;

-- Set all discountAmount to 0 and make discountAmount not null
UPDATE "OrderItem" SET "discountAmount" = 0;
ALTER TABLE "OrderItem" ALTER COLUMN "discountAmount" SET NOT NULL;
