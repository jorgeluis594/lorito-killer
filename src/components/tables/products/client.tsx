"use client";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import { columns } from "./columns";
import { Product } from "@/product/types";
import { buttonVariants } from "@/components/ui/button";
import ProductModalForm from "@/product/components/form/product-modal-form"
import Link from "next/link";

interface ProductsClientProps {
  data: Product[] | null;
  isLoading: boolean;
}

export default function ProductsClient({
  data,
  isLoading,
}: ProductsClientProps) {
  return (
    <>
      <div className="flex items-start justify-between">
        <Heading
          title={data ? `Productos (${data.length})` : ""}
          description="Gestiona tus productos!"
        />
        <ProductModalForm />
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
