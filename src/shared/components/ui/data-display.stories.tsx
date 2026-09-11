"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import CardResponsive from "./card-responsive";
import { InteractiveDataTable as DataTable } from "./interactive-data-table";
import { ScrollArea, ScrollBar } from "./scroll-area";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

type Product = { name: string; category: string; price: number };
const products: Product[] = [
  { name: "Lomo saltado", category: "Platos", price: 32 },
  { name: "Chicha morada", category: "Bebidas", price: 8 },
  { name: "Suspiro limeño", category: "Postres", price: 14 },
];
const columns: ColumnDef<Product>[] = [
  { accessorKey: "name", header: "Nombre" },
  { accessorKey: "category", header: "Categoría" },
  { accessorKey: "price", header: "Precio", cell: ({ row }) => `S/ ${row.original.price.toFixed(2)}` },
];

const meta = { title: "UI/Data display" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const BasicTable: Story = {
  render: () => (
    <Table>
      <TableCaption>Productos disponibles</TableCaption>
      <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Categoría</TableHead><TableHead className="text-right">Precio</TableHead></TableRow></TableHeader>
      <TableBody>{products.map((product) => <TableRow key={product.name}><TableCell>{product.name}</TableCell><TableCell>{product.category}</TableCell><TableCell className="text-right">S/ {product.price.toFixed(2)}</TableCell></TableRow>)}</TableBody>
      <TableFooter><TableRow><TableCell colSpan={2}>Total</TableCell><TableCell className="text-right">S/ 54.00</TableCell></TableRow></TableFooter>
    </Table>
  ),
};

export const PaginatedDataTable: Story = {
  render: () => <DataTable columns={columns} data={products} searchKey="name" />,
};

function ResponsiveCardsDemo() {
  // TanStack Table intentionally exposes non-memoizable functions.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data: products, columns, getCoreRowModel: getCoreRowModel() });
  return <div className="max-w-[720px]"><CardResponsive table={table} /></div>;
}

export const ResponsiveCards: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <ResponsiveCardsDemo />,
};

export const ScrollingContent: Story = {
  render: () => (
    <ScrollArea className="h-48 w-80 rounded-md border p-4">
      {Array.from({ length: 20 }, (_, index) => <p key={index} className="py-2">Producto {index + 1}</p>)}
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  ),
};
