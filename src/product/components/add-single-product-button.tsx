"use client";

import { Button } from "@/shared/components/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";
import { Boxes, Plus } from "lucide-react";
import { HelpTooltip } from "@/shared/components/ui/help-tooltip";
import React, { SyntheticEvent } from "react";
import { useProductFormStore } from "@/product/components/form/product-form-store-provider";
import { PackageProductType, SingleProductType } from "@/product/types";

export default function AddProductButtons() {
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
    <div className="flex">
      <Button
        type="button"
        variant="outline"
        className="text-xs md:text-sm mr-2 justify-start"
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
  );
}
