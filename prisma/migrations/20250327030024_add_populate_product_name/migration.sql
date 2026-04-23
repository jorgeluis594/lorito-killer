-- AlterTable
UPDATE "OrderItem" oi
SET "productName" = p.name
    FROM "Product" p
WHERE oi."productId" = p.id;

ALTER TABLE "OrderItem" ALTER COLUMN "productName" SET NOT NULL;