CREATE TYPE "OrderPaymentStatus" AS ENUM ('PENDING', 'PAID');

ALTER TABLE "Order" ADD COLUMN "paymentStatus" "OrderPaymentStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "Order" o
SET "paymentStatus" = 'PAID'
WHERE EXISTS (SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id);

CREATE TABLE "OrderItemCancellation" (
    "id" TEXT NOT NULL,
    "orderRoundItemId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "reason" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItemCancellation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderItem_orderId_productId_idx" ON "OrderItem"("orderId", "productId");
CREATE INDEX "OrderItemCancellation_orderRoundItemId_createdAt_idx" ON "OrderItemCancellation"("orderRoundItemId", "createdAt");

ALTER TABLE "OrderItemCancellation" ADD CONSTRAINT "OrderItemCancellation_orderRoundItemId_fkey" FOREIGN KEY ("orderRoundItemId") REFERENCES "OrderRoundItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItemCancellation" ADD CONSTRAINT "OrderItemCancellation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
