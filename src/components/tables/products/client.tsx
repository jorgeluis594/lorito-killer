"use client";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import { columns } from "./columns";
import { Product } from "@/product/types";
import { Button } from "@/components/ui/button";
import ProductModalForm from "@/product/components/form/product-modal-form";
import { SyntheticEvent, useState } from "react";
import { useProductFormStore } from "@/product/components/form/product-form-store-provider";

interface ProductsClientProps {
  data: Product[] | null;
  isLoading: boolean;
}

export default function ProductsClient({
  data,
  isLoading,
}: ProductsClientProps) {
  const { resetProduct, setOpen } = useProductFormStore((store) => store);

  const onNewProductClick = (e: SyntheticEvent) => {
    e.preventDefault();
    resetProduct();
    setOpen(true);
  };

  return (
    <>
      {/* ProductModalForm is used to edit (cell-action.tsx dispatches the
      action to edit the product and opens the modal) and create a new product.*/}
      <ProductModalForm />
      <div className="flex items-start justify-between">
        <Heading
          title={data ? `Productos (${data.length})` : ""}
          description="Gestiona tus productos!"
        />
        <Button
          type="button"
          variant="outline"
          className="text-xs md:text-sm"
          onClick={onNewProductClick}
        >
          <Plus className="mr-2 h-4 w-4" /> Agregar producto
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
