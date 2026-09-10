-- CreateEnum
CREATE TYPE "PreparationStation" AS ENUM ('KITCHEN', 'BAR');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "preparationStation" "PreparationStation";

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "preparationStation" "PreparationStation";

