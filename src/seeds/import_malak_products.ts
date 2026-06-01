import fs from "fs";
import path from "path";

import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

const COMPANY_ID = "ad3bb64d-beeb-46c4-8158-4179d4b91552";
const MALAK_PRODUCTS_PATH = path.join(process.cwd(), "src/seeds/malak.json");

type MalakProductRow = {
  ID: unknown;
  "NOMBRE DE LA PIEZA": unknown;
  CANTIDAD: unknown;
  "PRECIO UNITARIO (SOL)": unknown;
  "PRECIO DE VENTA (SOL)": unknown;
};

type ProductInput = {
  sku: string;
  name: string;
  stock: number;
  purchasePrice: number;
  price: number;
};

type ImportSummary = {
  created: number;
  updated: number;
};

const parseRequiredText = (
  value: unknown,
  field: keyof MalakProductRow,
  rowNumber: number,
): string => {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`Fila ${rowNumber}: ${field} debe ser texto o numero.`);
  }

  const text = String(value).trim();

  if (!text) {
    throw new Error(`Fila ${rowNumber}: ${field} es requerido.`);
  }

  return text;
};

const parseRequiredNumber = (
  value: unknown,
  field: keyof MalakProductRow,
  rowNumber: number,
): number => {
  const text = parseRequiredText(value, field, rowNumber).replace(",", ".");
  const parsed = Number(text);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Fila ${rowNumber}: ${field} no es un numero valido.`);
  }

  return parsed;
};

const parseOptionalNumber = (
  value: unknown,
  field: keyof MalakProductRow,
  rowNumber: number,
  defaultValue: number,
): number => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return defaultValue;
  }

  return parseRequiredNumber(value, field, rowNumber);
};

const readMalakProducts = (): ProductInput[] => {
  const rawData = fs.readFileSync(MALAK_PRODUCTS_PATH, "utf8");
  const rows: unknown = JSON.parse(rawData);

  if (!Array.isArray(rows)) {
    throw new Error("malak.json debe contener un arreglo de productos.");
  }

  const seenSkus = new Set<string>();

  return rows.map((row, index) => {
    const rowNumber = index + 1;

    if (!row || typeof row !== "object") {
      throw new Error(`Fila ${rowNumber}: el registro debe ser un objeto.`);
    }

    const productRow = row as MalakProductRow;
    const sku = parseRequiredText(productRow.ID, "ID", rowNumber);

    if (seenSkus.has(sku)) {
      throw new Error(`Fila ${rowNumber}: SKU duplicado en malak.json: ${sku}`);
    }

    seenSkus.add(sku);

    return {
      sku,
      name: parseRequiredText(
        productRow["NOMBRE DE LA PIEZA"],
        "NOMBRE DE LA PIEZA",
        rowNumber,
      ),
      stock: parseRequiredNumber(productRow.CANTIDAD, "CANTIDAD", rowNumber),
      purchasePrice: parseOptionalNumber(
        productRow["PRECIO UNITARIO (SOL)"],
        "PRECIO UNITARIO (SOL)",
        rowNumber,
        0,
      ),
      price: parseOptionalNumber(
        productRow["PRECIO DE VENTA (SOL)"],
        "PRECIO DE VENTA (SOL)",
        rowNumber,
        0,
      ),
    };
  });
};

const importProducts = async (
  products: ProductInput[],
): Promise<ImportSummary> => {
  const summary: ImportSummary = { created: 0, updated: 0 };

  await prisma().$transaction(
    async (tx) => {
      for (const product of products) {
        const existingProducts = await tx.product.findMany({
          where: {
            companyId: COMPANY_ID,
            sku: product.sku,
          },
          select: { id: true },
        });

        if (existingProducts.length > 1) {
          throw new Error(
            `Existen ${existingProducts.length} productos con companyId ${COMPANY_ID} y sku ${product.sku}.`,
          );
        }

        const data = {
          name: product.name,
          stock: new Prisma.Decimal(product.stock),
          purchasePrice: new Prisma.Decimal(product.purchasePrice),
          price: new Prisma.Decimal(product.price),
          unitType: "UNIT" as const,
          productType: "SINGLE_PRODUCT" as const,
          hidden: false,
          description: "",
        };

        if (existingProducts.length === 0) {
          await tx.product.create({
            data: {
              ...data,
              companyId: COMPANY_ID,
              sku: product.sku,
            },
          });
          summary.created += 1;
          continue;
        }

        await tx.product.update({
          where: { id: existingProducts[0].id },
          data,
        });
        summary.updated += 1;
      }
    },
    {
      maxWait: 10_000,
      timeout: 60_000,
    },
  );

  return summary;
};

const execute = async () => {
  const products = readMalakProducts();
  const summary = await importProducts(products);

  console.log(
    `Productos Malak procesados: ${products.length}. Creados: ${summary.created}. Actualizados: ${summary.updated}.`,
  );
};

execute()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma().$disconnect();
  });
