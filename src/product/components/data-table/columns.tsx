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
import { Badge } from "@/shared/components/ui/badge";

const HiddenProductNameCell = ({ product }: { product: Product }) => {
  if (!product.hidden) {
    return <span>{product.name}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{product.name}</span>
            <Badge variant="secondary" className="text-xs">
              Oculto
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Este producto no es visible en el punto de venta</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "NOMBRE",
    cell: ({ row }) => <HiddenProductNameCell product={row.original} />,
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
