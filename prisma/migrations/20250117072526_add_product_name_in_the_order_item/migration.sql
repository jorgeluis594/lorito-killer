/*
  Warnings:

  - Added the required column `productName` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "productName" TEXT;
UPDATE "OrderItem" oi
SET "productName" = p.name
FROM "Product" p
WHERE oi."productId" = p.id;
ALTER TABLE "OrderItem" ALTER COLUMN "productName" SET NOT NULL;