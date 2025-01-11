import fs from "fs";

import {
  type Category as LoritoCategory,
  type Product as LoritoProduct,
} from "./types/lorito_product";
import { Category } from "@/category/types";
import { create as createCategory } from "@/category/db_respository";
import type { SingleProduct, Product } from "@/product/types";
import { create as createProduct } from "@/product/db_repository";
import { response } from "@/lib/types";

function chunkArray<T>(array: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

(async function loadProducts(companyId: string) {
  const rawData = fs.readFileSync("./src/seeds/data/loritopos/products.json");
  const loritoProducts: LoritoProduct[] = JSON.parse(rawData.toString());
  const categoriesRawData = fs.readFileSync(
    "./src/seeds/data/loritopos/categories.json",
  );
  const loritoCategories: LoritoCategory[] = JSON.parse(
    categoriesRawData.toString(),
  );

  // { loritoCategoryId: categoryId }
  const categoriesMapper: Record<string, Category> = {};

  for (const category of loritoCategories) {
    if (categoriesMapper[category.id.toString()]) continue;

    const response = await createCategory({
      companyId,
      name: category.name,
    });

    if (response.success) {
      categoriesMapper[category.id.toString()] = response.data;
    }
  }

  const buildProduct = (product: LoritoProduct): SingleProduct => ({
    companyId,
    name: product.description,
    sku: product.barcode,
    description: "",
    type: "SingleProduct",
    unitType: "unit",
    price: parseFloat(product.sale_unit_price),
    purchasePrice: product.purchase_unit_price
      ? parseFloat(product.purchase_unit_price)
      : 0,
    stock: product.stock ? parseFloat(product.stock) : 0,
    categories: product.category_id
      ? [categoriesMapper[product.category_id.toString()]]
      : [],
  });

  const productCreator = async (product: LoritoProduct) =>
    createProduct(buildProduct(product));

  const performProduct = async (product: LoritoProduct) => {
    if (
      product.item_unit_types &&
      Array.isArray(product.item_unit_types) &&
      product.item_unit_types.length
    ) {
      const promises = product.item_unit_types.map((item) => {
        return productCreator({
          ...product,
          stock: item.stock,
          sale_unit_price: item.price1,
          description: `${product.description} - ${item.description}`,
        });
      });
      const responses: response<Product>[] = await Promise.all(promises);

      responses.forEach((response) => {
        if (!response.success) {
          console.error(response.message);
        }
      });

      return;
    }

    const response = await createProduct(buildProduct(product));
    if (!response.success) {
      console.error(response.message);
    }
  };

  for (const products of chunkArray(loritoProducts, 10)) {
    await Promise.all(products.map(performProduct));
  }
})("0ead8e2b-b3fc-41ed-916f-58ad99d0d561");
