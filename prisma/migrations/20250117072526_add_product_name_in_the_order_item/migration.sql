/*
  Warnings:

  - Added the required column `productName` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "productName" DROP NOT NULL;
UPDATE "OrderItem" oi
SET "productName" = p.name
FROM "Product" p
WHERE oi."productId" = p.id AND oi."productName" IS NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "productName" SET NOT NULL;