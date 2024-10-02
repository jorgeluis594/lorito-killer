-- AlterEnum
ALTER TYPE "LocalityLevel" ADD VALUE 'COUNTRY';

-- DropForeignKey
ALTER TABLE "Locality" DROP CONSTRAINT "Locality_parentId_fkey";

-- AddForeignKey
ALTER TABLE "Locality" ADD CONSTRAINT "Locality_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Locality"("idUbigeo") ON DELETE SET NULL ON UPDATE CASCADE;
