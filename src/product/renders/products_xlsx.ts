import ExcelJS from "exceljs";
import { SingleProduct } from "@/product/types";

const REPORT_SHEET_TITLE = "Inventario de productos";
const REPORT_HEADERS = [
  "Nombre",
  "Categorías",
  "Precio de venta",
  "Código de barras",
  "Precio de compra",
  "Stock",
  "Costo total",
];

export const createWorkbookBuffer = async (products: SingleProduct[]) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kogoz.pe";
  workbook.lastModifiedBy = "Kogoz.pe";
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet(REPORT_SHEET_TITLE);
  sheet.addRow(REPORT_HEADERS);

  let totalProducts = 0;
  let totalStockCost = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const categories = product.categories.map((c) => c.name).join(", ");
    const stockCost = product.purchasePrice * product.stock;

    totalProducts++;
    totalStockCost += stockCost;

    sheet.addRow([
      product.name,
      categories,
      product.price,
      product.sku || "",
      product.purchasePrice,
      product.stock,
      stockCost,
    ]);
  }

  sheet.addRow([]);
  sheet.addRow(["Total de productos", totalProducts]);
  sheet.addRow(["Valor total del inventario", totalStockCost]);

  return workbook.xlsx.writeBuffer();
};
