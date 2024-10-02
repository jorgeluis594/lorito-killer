-- CreateEnum
CREATE TYPE "LocalityLevel" AS ENUM ('DEPARTMENT', 'PROVINCE', 'DISTRICT');

-- CreateTable
CREATE TABLE "Locality" (
    "id" TEXT NOT NULL,
    "idUbigeo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "searchValue" TEXT NOT NULL,
    "level" "LocalityLevel" NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Locality_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Locality_idUbigeo_key" ON "Locality"("idUbigeo");

-- CreateIndex
CREATE INDEX "Locality_name_code_tag_parentId_idx" ON "Locality"("name", "code", "tag", "parentId");

-- AddForeignKey
ALTER TABLE "Locality" ADD CONSTRAINT "Locality_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Locality"("id") ON DELETE SET NULL ON UPDATE CASCADE;
