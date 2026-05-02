-- CreateEnum
CREATE TYPE "DocumentTaxDispatchStatus" AS ENUM ('PENDING', 'ENQUEUED', 'FAILED');

-- CreateTable
CREATE TABLE "DocumentTaxDispatch" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "DocumentTaxDispatchStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "jobId" TEXT,
    "lastError" TEXT,
    "enqueuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTaxDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTaxDispatch_documentId_key" ON "DocumentTaxDispatch"("documentId");

-- CreateIndex
CREATE INDEX "DocumentTaxDispatch_status_createdAt_idx" ON "DocumentTaxDispatch"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentTaxDispatch_companyId_idx" ON "DocumentTaxDispatch"("companyId");

-- AddForeignKey
ALTER TABLE "DocumentTaxDispatch" ADD CONSTRAINT "DocumentTaxDispatch_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTaxDispatch" ADD CONSTRAINT "DocumentTaxDispatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
