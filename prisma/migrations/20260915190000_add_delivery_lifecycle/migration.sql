CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'DISPATCHED', 'DELIVERED');

CREATE TABLE "Delivery" (
  "orderId" TEXT NOT NULL,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "createdById" TEXT NOT NULL,
  "dispatchedAt" TIMESTAMP(3),
  "dispatchedById" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "deliveredById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Delivery_pkey" PRIMARY KEY ("orderId"),
  CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Delivery_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Delivery_dispatchedById_fkey" FOREIGN KEY ("dispatchedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Delivery_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Delivery_dispatch_audit_check" CHECK (("status" = 'PENDING' AND "dispatchedAt" IS NULL AND "dispatchedById" IS NULL AND "deliveredAt" IS NULL AND "deliveredById" IS NULL) OR ("status" = 'DISPATCHED' AND "dispatchedAt" IS NOT NULL AND "dispatchedById" IS NOT NULL AND "deliveredAt" IS NULL AND "deliveredById" IS NULL) OR ("status" = 'DELIVERED' AND "dispatchedAt" IS NOT NULL AND "dispatchedById" IS NOT NULL AND "deliveredAt" IS NOT NULL AND "deliveredById" IS NOT NULL AND "deliveredAt" >= "dispatchedAt"))
);

CREATE INDEX "Order_companyId_orderType_createdAt_idx" ON "Order"("companyId", "orderType", "createdAt");
