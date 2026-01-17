"use client";
import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { Product, SingleProductType } from "@/product/types";
import { formatPrice } from "@/lib/utils";
import { UNIT_TYPE_MAPPER } from "@/product/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

const HiddenProductCell = ({
  product,
  children,
}: {
  product: Product;
  children: React.ReactNode;
}) => {
  const content = (
    <span className={product.hidden ? "text-muted-foreground" : ""}>
      {children}
    </span>
  );

  if (!product.hidden) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p>Este producto está oculto</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "NOMBRE",
    cell: ({ row }) => (
      <HiddenProductCell product={row.original}>
        {row.original.name}
      </HiddenProductCell>
    ),
  },
  {
    accessorKey: "categories",
    header: "CATEGORÍAS",
    cell: ({ row }) => (
      <span className={row.original.hidden ? "text-muted-foreground" : ""}>
        {row.original.categories.map((category) => category.name).join(", ") ||
          "---"}
      </span>
    ),
  },
  {
    accessorKey: "stock",
    header: "CANTIDAD",
    cell: ({ row }) => (
      <span className={row.original.hidden ? "text-muted-foreground" : ""}>
        {row.original.type === SingleProductType &&
          `${row.original.stock} ${UNIT_TYPE_MAPPER[row.original.unitType]}`}
      </span>
    ),
  },
  {
    accessorKey: "purchasePrice",
    header: "PRECIO DE VENTA",
    cell: ({ row }) => (
      <span className={row.original.hidden ? "text-muted-foreground" : ""}>
        {formatPrice(row.original.price)}
      </span>
    ),
  },
  {
    accessorKey: "price",
    header: "PRECIO DE COMPRA",
    cell: ({ row }) => (
      <span className={row.original.hidden ? "text-muted-foreground" : ""}>
        {row.original.type === SingleProductType &&
          formatPrice(row.original.purchasePrice)}
      </span>
    ),
  },
  {
    accessorKey: "sku",
    header: "CÓDIGO",
    cell: ({ row }) => (
      <span className={row.original.hidden ? "text-muted-foreground" : ""}>
        {row.original.sku || "---"}
      </span>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <CellAction product={row.original} />,
  },
];
