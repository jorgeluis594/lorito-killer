-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('UNIT', 'KG');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "unitType" "UnitType";
