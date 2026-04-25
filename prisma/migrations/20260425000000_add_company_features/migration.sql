-- CreateTable
CREATE TABLE "CompanyFeature" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyFeature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyFeature_companyId_idx" ON "CompanyFeature"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyFeature_companyId_key_key" ON "CompanyFeature"("companyId", "key");

-- AddForeignKey
ALTER TABLE "CompanyFeature" ADD CONSTRAINT "CompanyFeature_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
