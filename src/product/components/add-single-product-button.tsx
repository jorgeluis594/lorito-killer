"use client";

import { Button } from "@/shared/components/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";
import {
  Boxes,
  Briefcase,
  ChevronDown,
  PackagePlus,
  Plus,
  Utensils,
} from "lucide-react";
import React, { useState } from "react";
import { useProductFormStore } from "@/product/components/form/product-form-store-provider";
import {
  DishProductType,
  PackageProductType,
  SingleProductType,
} from "@/product/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import ServiceProductModal from "@/product/components/form/service-product-modal";
import { useRouter } from "next/navigation";

export default function AddProductButtons({
  isAdmin = false,
}: {
  isAdmin?: boolean;
}) {
  const [serviceOpen, setServiceOpen] = useState(false);
  const router = useRouter();
  const { resetProduct, setOpen, performingAction } = useProductFormStore(
    (store) => store,
  );

  const onNewProductClick = () => {
    resetProduct(SingleProductType);
    setOpen(true);
  };

  const onNewPackageClick = () => {
    resetProduct(PackageProductType);
    setOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" disabled={performingAction}>
            {performingAction ? (
              <ReloadIcon className="mr-2 size-4 animate-spin" />
            ) : (
              <PackagePlus aria-hidden="true" className="mr-2 size-4" />
            )}
            Agregar
            <ChevronDown aria-hidden="true" className="ml-2 size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Tipo de producto</DropdownMenuLabel>
            <DropdownMenuItem
              className="min-h-11 gap-3"
              onSelect={onNewProductClick}
            >
              <Plus aria-hidden="true" className="size-4" />
              Producto con inventario
            </DropdownMenuItem>
            {isAdmin ? (
              <DropdownMenuItem
                className="min-h-11 gap-3"
                onSelect={() => {
                  resetProduct(DishProductType);
                  setOpen(true);
                }}
              >
                <Utensils aria-hidden="true" className="size-4" />
                Plato
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              className="min-h-11 gap-3"
              onSelect={onNewPackageClick}
            >
              <Boxes aria-hidden="true" className="size-4" />
              Pack de productos
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11 gap-3"
              onSelect={() => setServiceOpen(true)}
            >
              <Briefcase aria-hidden="true" className="size-4" />
              Servicio sin inventario
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <ServiceProductModal
        open={serviceOpen}
        onClose={() => setServiceOpen(false)}
        onActionPerformed={() => router.refresh()}
      />
    </>
  );
}
