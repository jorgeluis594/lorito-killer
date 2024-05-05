"use client";
import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { Product, SingleProductType } from "@/product/types";
import { formatPrice } from "@/lib/utils";

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "NOMBRE",
  },
  {
    accessorKey: "categories",
    header: "CATEGORÍAS",
    cell: ({ row }) =>
      row.original.categories.map((category) => category.name).join(", "),
  },
  {
    accessorKey: "sku",
    header: "CÓDIGO",
  },
  {
    accessorKey: "stock",
    header: "CANTIDAD",
  },
  {
    accessorKey: "purchasePrice",
    header: "PRECIO DE VENTA",
    cell: ({ row }) => formatPrice(row.original.price),
  },
  {
    accessorKey: "price",
    header: "PRECIO DE COMPRA",
    cell: ({ row }) =>
      row.original.type === SingleProductType &&
      row.original.purchasePrice &&
      formatPrice(row.original.purchasePrice),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <CellAction product={row.original} />,
  },
];
