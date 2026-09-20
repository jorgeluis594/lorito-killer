CREATE TYPE "PrinterStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "PrinterPaperWidth" AS ENUM ('MM58', 'MM80');

CREATE TABLE "PrintClientLinkCode" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrintClientLinkCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrintClient" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "machineName" TEXT NOT NULL,
    "credentialHash" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "lastInventoryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrintClient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Printer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "printClientId" TEXT NOT NULL,
    "localName" TEXT NOT NULL,
    "status" "PrinterStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastDetectedAt" TIMESTAMP(3) NOT NULL,
    "paperWidth" "PrinterPaperWidth" NOT NULL DEFAULT 'MM58',
    "columns" INTEGER NOT NULL DEFAULT 32,
    "codepageMapping" TEXT NOT NULL DEFAULT 'epson',
    "cutEnabled" BOOLEAN NOT NULL DEFAULT true,
    "feedBeforeCut" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Printer_columns_check" CHECK ("columns" > 0),
    CONSTRAINT "Printer_feedBeforeCut_check" CHECK ("feedBeforeCut" >= 0)
);

CREATE UNIQUE INDEX "PrintClientLinkCode_codeHash_key" ON "PrintClientLinkCode"("codeHash");
CREATE INDEX "PrintClientLinkCode_expiresAt_idx" ON "PrintClientLinkCode"("expiresAt");
CREATE INDEX "PrintClientLinkCode_companyId_idx" ON "PrintClientLinkCode"("companyId");
CREATE UNIQUE INDEX "PrintClient_credentialHash_key" ON "PrintClient"("credentialHash");
CREATE INDEX "PrintClient_companyId_idx" ON "PrintClient"("companyId");
CREATE UNIQUE INDEX "Printer_printClientId_localName_key" ON "Printer"("printClientId", "localName");
CREATE INDEX "Printer_companyId_idx" ON "Printer"("companyId");

ALTER TABLE "PrintClientLinkCode" ADD CONSTRAINT "PrintClientLinkCode_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrintClientLinkCode" ADD CONSTRAINT "PrintClientLinkCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrintClient" ADD CONSTRAINT "PrintClient_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_printClientId_fkey" FOREIGN KEY ("printClientId") REFERENCES "PrintClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
