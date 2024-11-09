import prisma from "../lib/prisma";
import fs from "fs";
import {SingleProduct, SingleProductType} from "../product/types";

const loadLoritoProducts = async (pathName: string, companyId: string) => {
  const data = fs.readFileSync(pathName, 'utf-8');
  const rawResults = JSON.parse(data);
  console.log("JSON file successfully processed");

  const products: SingleProduct[] = rawResults.reduce((acc: SingleProduct[], loritoProduct: any) => {
    if (loritoProduct.item_unit_types.length === 0) {
      const product: SingleProduct = {
        id: crypto.randomUUID(),
        companyId: companyId,
        name: loritoProduct.description,
        price: parseFloat(loritoProduct.amount_sale_unit_price),
        sku: loritoProduct.barcode,
        description: "",
        purchasePrice: parseFloat(loritoProduct.purchase),
        type: SingleProductType,
        unitType: "unit",
        stock: parseFloat(loritoProduct.stock) || 0,
        categories: []
      };
      acc.push(product);
    } else {
      loritoProduct.item_unit_types.forEach((loritoItem: any) => {
        const product: SingleProduct = {
          id: crypto.randomUUID(),
          companyId: companyId,
          name: `${loritoProduct.description} ${loritoItem.description}`,
          price: parseFloat(loritoItem.price1),
          sku: loritoProduct.barcode,
          description: "",
          purchasePrice: parseFloat(loritoProduct.purchase),
          type: SingleProductType,
          unitType: "unit",
          stock: parseFloat(loritoItem.stock) || 0,
          categories: []
        };
        acc.push(product);
      });
    }
    return acc;
  }, []);

  try {
    for (const result of products) {
      await prisma().product.create({
        data: {
          id: result.id,
          companyId: result.companyId,
          name: result.name,
          price: result.price,
          sku: result.sku,
          description: result.description,
          purchasePrice: result.purchasePrice,
          unitType: "UNIT",
          stock: result.stock,
        },
      });
    }
  } catch (error) {
    console.error("Error inserting data:", error);
  } finally {
    await prisma().$disconnect();
  }
}

const loritoJson = "src/seeds/product.json";
const companyIdJson = "fdc0f5ea-22b5-4683-86a7-087130362700";

loadLoritoProducts(loritoJson, companyIdJson).then(() => {
  console.log("Listo product");
});
