-- DropIndex (unique constraints that conflict with soft-delete)
DROP INDEX IF EXISTS "Zone_companyId_name_key";
DROP INDEX IF EXISTS "Table_companyId_number_key";

-- CreateIndex (partial unique indexes that only apply to active records)
CREATE UNIQUE INDEX "Zone_companyId_name_active_key" ON "Zone"("companyId", "name") WHERE "active" = true;
CREATE UNIQUE INDEX "Table_companyId_number_active_key" ON "Table"("companyId", "number") WHERE "active" = true;

-- CreateIndex (composite index for Table queries filtering by companyId + zoneId)
CREATE INDEX "Table_companyId_zoneId_idx" ON "Table"("companyId", "zoneId");
