DROP INDEX IF EXISTS "OrderItem_kitchenStatus_idx";

ALTER TABLE "OrderItem"
DROP CONSTRAINT IF EXISTS "OrderItem_kitchenTakenById_fkey",
DROP CONSTRAINT IF EXISTS "OrderItem_kitchenReadyById_fkey",
DROP CONSTRAINT IF EXISTS "OrderItem_servedById_fkey",
DROP CONSTRAINT IF EXISTS "OrderItem_cancelledById_fkey";

ALTER TABLE "Product" DROP COLUMN "preparationStation";

ALTER TABLE "OrderItem"
DROP COLUMN "preparationStation",
DROP COLUMN "round",
DROP COLUMN "kitchenStatus",
DROP COLUMN "kitchenTakenAt",
DROP COLUMN "kitchenTakenById",
DROP COLUMN "kitchenReadyAt",
DROP COLUMN "kitchenReadyById",
DROP COLUMN "servedAt",
DROP COLUMN "servedById",
DROP COLUMN "cancellationReason",
DROP COLUMN "cancelledAt",
DROP COLUMN "cancelledById";

DROP TYPE "PreparationStation";
DROP TYPE "OrderItemKitchenStatus";
