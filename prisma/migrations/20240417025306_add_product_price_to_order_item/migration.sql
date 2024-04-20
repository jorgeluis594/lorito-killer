/*
  Warnings:

  - Added the required column `productPrice` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "productPrice" DECIMAL(65,30) NOT NULL;
