ALTER TYPE "OrderItemKitchenStatus" ADD VALUE 'READY';
ALTER TYPE "OrderItemKitchenStatus" ADD VALUE 'SERVED';

ALTER TABLE "OrderItem"
ADD COLUMN "kitchenReadyAt" TIMESTAMP(3),
ADD COLUMN "kitchenReadyById" TEXT,
ADD COLUMN "servedAt" TIMESTAMP(3),
ADD COLUMN "servedById" TEXT;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_kitchenReadyById_fkey"
FOREIGN KEY ("kitchenReadyById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_servedById_fkey"
FOREIGN KEY ("servedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
