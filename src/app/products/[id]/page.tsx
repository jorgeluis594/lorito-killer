import BreadCrumb from "@/components/breadcrumb";
import { ProductForm } from "@/components/forms/product-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";
import { find as findProduct } from "@/product/db_repository";
import { notFound } from 'next/navigation'

export default async function Page({params}: { params: {id: string} }) {
  const { id } = params;

  const response = await findProduct(id)
  if (!response.success) {
    return notFound();
  }

  const breadcrumbItems = [
    { title: "Productos", link: "/products" },
    { title: "Editar", link: `/products/${id}` },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-5">
        <BreadCrumb items={breadcrumbItems} />
        <ProductForm
          categories={[
            { _id: "shirts", name: "polos" },
            { _id: "pants", name: "pantalones" },
          ]}
          initialProduct={response.data}
        />
      </div>
    </ScrollArea>
  );
}