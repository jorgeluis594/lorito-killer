"use client";
import { CellAction } from "./cell-action";
import { Product, SingleProductType } from "@/product/types";
import { formatPrice } from "@/lib/utils";
import { UNIT_TYPE_MAPPER } from "@/product/constants";
import { TableColumn } from "@/shared/components/ui/data-table";
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

export const columns: TableColumn<Product>[] = [
  {
    id: "name",
    header: "Producto",
    cell: (product) => <HiddenProductNameCell product={product} />,
    mobile: "title",
  },
  {
    id: "category",
    header: "Categorías",
    cell: (product) => (
      <span className={product.hidden ? "text-muted-foreground" : ""}>
        {product.categories.map((category) => category.name).join(", ") ||
          "---"}
      </span>
    ),
    mobile: "description",
  },
  {
    id: "status",
    header: "Stock",
    align: "right",
    cell: (product) =>
      product.type === SingleProductType ? (
        <Badge
          variant={product.stock <= 0 ? "destructive" : "outline"}
        >
          {product.stock <= 0
            ? "Sin stock"
            : `${product.stock} ${UNIT_TYPE_MAPPER[product.unitType]}`}
        </Badge>
      ) : (
        "—"
      ),
    mobile: "description",
  },
  {
    id: "price",
    header: "Precio de venta",
    align: "right",
    cell: (product) => (
      <span className={product.hidden ? "text-muted-foreground" : ""}>
        {formatPrice(product.price)}
      </span>
    ),
    mobile: "value",
  },
  {
    id: "purchasePrice",
    header: "Precio de compra",
    align: "right",
    cell: (product) => (
      <span className={product.hidden ? "text-muted-foreground" : ""}>
        {product.type === SingleProductType
          ? formatPrice(product.purchasePrice)
          : "—"}
      </span>
    ),
  },
  {
    id: "sku",
    header: "Código",
    cell: (product) => (
      <span className={product.hidden ? "text-muted-foreground" : ""}>
        {product.sku || "—"}
      </span>
    ),
  },
  {
    id: "actions",
    header: <span className="sr-only">Acciones</span>,
    align: "right",
    cell: (product) => <CellAction product={product} />,
    mobile: "actions",
  },
];
