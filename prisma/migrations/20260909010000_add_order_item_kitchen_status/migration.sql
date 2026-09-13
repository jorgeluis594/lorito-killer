CREATE TYPE "OrderItemKitchenStatus" AS ENUM ('PENDING', 'PREPARING', 'CANCELLED');

ALTER TABLE "OrderItem"
ADD COLUMN "kitchenStatus" "OrderItemKitchenStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "kitchenTakenAt" TIMESTAMP(3),
ADD COLUMN "kitchenTakenById" TEXT,
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelledById" TEXT;

CREATE INDEX "OrderItem_kitchenStatus_idx" ON "OrderItem"("kitchenStatus");

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_kitchenTakenById_fkey"
FOREIGN KEY ("kitchenTakenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_cancelledById_fkey"
FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
