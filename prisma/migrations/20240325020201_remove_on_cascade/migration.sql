-- DropForeignKey
ALTER TABLE "CategoriesOnProduct" DROP CONSTRAINT "CategoriesOnProduct_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "CategoriesOnProduct" DROP CONSTRAINT "CategoriesOnProduct_productId_fkey";

-- DropForeignKey
ALTER TABLE "Photo" DROP CONSTRAINT "Photo_productId_fkey";

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriesOnProduct" ADD CONSTRAINT "CategoriesOnProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriesOnProduct" ADD CONSTRAINT "CategoriesOnProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
