"use client";
import { Heading } from "@/shared/components/ui/heading";
import { Separator } from "@/shared/components/ui/separator";
import { Plus, Boxes } from "lucide-react";
import {
  PackageProductType,
  Product,
  SingleProductType,
} from "@/product/types";
import { Button } from "@/shared/components/ui/button";
import React, { SyntheticEvent } from "react";
import { useProductFormStore } from "@/product/components/form/product-form-store-provider";
import { ReloadIcon } from "@radix-ui/react-icons";
import ProductModalForm from "@/product/components/form/product-modal-form";
import {HelpTooltip} from "@/shared/components/ui/help-tooltip";

interface ProductsClientProps {
  data: Product[] | null;
  isLoading: boolean;
  onUpsertProductPerformed: () => void;
}

export default function ProductsClient({
  data,
  onUpsertProductPerformed,
}: ProductsClientProps) {
  const { resetProduct, setOpen, performingAction } = useProductFormStore(
    (store) => store,
  );

  const onNewProductClick = (e: SyntheticEvent) => {
    e.preventDefault();
    resetProduct(SingleProductType);
    setOpen(true);
  };

  const onNewPackageClick = (e: SyntheticEvent) => {
    e.preventDefault();
    resetProduct(PackageProductType);
    setOpen(true);
  };

  return (
    <>
      {/* ProductModalForm is used to edit (cell-action.tsx dispatches the
      action to edit the product and opens the modal) and create a new product.*/}
      <ProductModalForm onActionPerformed={onUpsertProductPerformed} />
      <div className="flex items-start justify-between">
        <Heading
          title={data ? `Productos (${data.length})` : ""}
          description="Gestiona tus productos!"
        />
          <div className="flex">
            <Button
              type="button"
              variant="outline"
              className="text-xs md:text-sm mr-2 justify-start"
              disabled={performingAction}
              onClick={onNewProductClick}
            >
              {performingAction ? (
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                <span>Agregar producto</span>
                <HelpTooltip text="Agrega un nuevo Producto" />
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="text-xs mr-2 md:text-sm justify-start"
            disabled={performingAction}
            onClick={onNewPackageClick}
          >
            {performingAction ? (
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                <Boxes className="mr-2 h-5 w-5" />
                <span>Agregar Pack</span>
                <HelpTooltip text="Agrega un nuevo paquete de tus Producto." />
              </>
            )}
          </Button>
        </div>
      </div>
      <Separator />
    </>
  );
}
