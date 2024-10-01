/*
  Warnings:

  - Changed the type of `number` on the `Document` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Document" ALTER COLUMN number TYPE integer USING (number::integer)
