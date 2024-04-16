"use client";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import { columns } from "./columns";
import { Product } from "@/product/types";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ProductoModalForm } from "@/product/components/form/product-modal-form";
import { useState } from "react";

interface ProductsClientProps {
  data: Product[] | null;
  isLoading: boolean;
}

export default function ProductsClient({
  data,
  isLoading,
}: ProductsClientProps) {

  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex items-start justify-between">
        <Heading
          title={data ? `Productos (${data.length})` : ""}
          description="Gestiona tus productos!"
        />
        <Button type="button" variant="outline" className="text-xs md:text-sm" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4"/> Agregar producto</Button>
        <ProductoModalForm open={open} setOpen={setOpen}/>
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
