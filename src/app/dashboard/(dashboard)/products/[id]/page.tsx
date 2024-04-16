import BreadCrumb from "@/components/breadcrumb";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";
import { find as findProduct } from "@/product/db_repository";
import { notFound } from "next/navigation";
import { getMany } from "@/category/db_respository";
import { ProductoModalForm } from "@/product/components/form/product-modal-form";

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  const response = await findProduct(id);
  if (!response.success) {
    return notFound();
  }

  const breadcrumbItems = [
    { title: "Productos", link: "/products" },
    { title: "Editar", link: `/products/${id}` },
  ];

  const categoriesResponse = await getMany();
  if (!categoriesResponse.success) {
    return notFound();
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-5">
        <BreadCrumb items={breadcrumbItems} />
        <ProductoModalForm initialProduct={response.data} />
      </div>
    </ScrollArea>
  );
}
