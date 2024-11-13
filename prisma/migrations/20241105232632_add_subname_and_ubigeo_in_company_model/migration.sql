/*
  Warnings:

  - Added the required column `department` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `district` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provincial` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subName` to the `Company` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "department" TEXT NOT NULL,
ADD COLUMN     "district" TEXT NOT NULL,
ADD COLUMN     "provincial" TEXT NOT NULL,
ADD COLUMN     "subName" TEXT NOT NULL;
