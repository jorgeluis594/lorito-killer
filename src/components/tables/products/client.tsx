"use client";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import { columns } from "./columns";
import { Product } from "@/product/types";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

interface ProductsClientProps {
  data: Product[];
}

export default function ProductsClient({ data }: ProductsClientProps) {

  return (
    <>
      <div className="flex items-start justify-between">
        <Heading
          title={`Productos (${data.length})`}
          description="Gestiona tus productos!"
        />
        <Link href="/products/new" className={`${buttonVariants({ variant: "outline" })} text-xs md:text-sm`}>
          <Plus className="mr-2 h-4 w-4" /> Agregar producto
        </Link>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
    </>
  );
}