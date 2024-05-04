"use client";
import { DataTable } from "@/shared/components/ui/data-table";
import { Heading } from "@/shared/components/ui/heading";
import { Separator } from "@/shared/components/ui/separator";
import { Plus } from "lucide-react";
import { columns } from "./columns";
import { Product } from "@/product/types";
import { Button } from "@/shared/components/ui/button";
import ProductModalForm from "@/product/components/form/product-modal-form";
import { SyntheticEvent, useState } from "react";
import { useProductFormStore } from "@/product/components/form/product-form-store-provider";
import { ReloadIcon } from "@radix-ui/react-icons";

interface ProductsClientProps {
  data: Product[] | null;
  isLoading: boolean;
  onUpsertProductPerformed: () => void;
}

export default function ProductsClient({
  data,
  isLoading,
  onUpsertProductPerformed,
}: ProductsClientProps) {
  const { resetProduct, setOpen, performingAction } = useProductFormStore(
    (store) => store,
  );

  const onNewProductClick = (e: SyntheticEvent) => {
    e.preventDefault();
    resetProduct();
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
        <Button
          type="button"
          variant="outline"
          className="text-xs md:text-sm"
          disabled={performingAction}
          onClick={onNewProductClick}
        >
          {performingAction ? (
            <>
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> Guardando
              product
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" /> Agregar producto
            </>
          )}
        </Button>
      </div>
      <Separator />
      <DataTable
        searchKey="name"
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
      />
    </>
  );
}
