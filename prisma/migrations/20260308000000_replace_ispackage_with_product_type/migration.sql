/*
  Warnings:

  - You are about to drop the column `isPackage` on the `Product` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SINGLE_PRODUCT', 'PACKAGE_PRODUCT', 'SERVICE_PRODUCT');

-- AlterTable: First add the column with a default value
ALTER TABLE "Product" ADD COLUMN "productType" "ProductType" NOT NULL DEFAULT 'SINGLE_PRODUCT';

-- Update existing data based on isPackage value
UPDATE "Product" SET "productType" =
  CASE
    WHEN "isPackage" = true THEN 'PACKAGE_PRODUCT'::"ProductType"
    ELSE 'SINGLE_PRODUCT'::"ProductType"
  END;

-- Now drop the isPackage column
ALTER TABLE "Product" DROP COLUMN "isPackage";

-- Add index for better query performance
CREATE INDEX "Product_productType_idx" ON "Product"("productType");
