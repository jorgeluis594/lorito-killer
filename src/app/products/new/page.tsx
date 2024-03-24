import BreadCrumb from "@/components/breadcrumb";
import { ProductForm } from "@/components/forms/product-form/product-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";
import { getMany } from "@/category/db_respository";
import { Category } from "@/category/types";

export default async function Page() {
  const breadcrumbItems = [
    { title: "Productos", link: "/products" },
    { title: "Registro", link: "/products/new" },
  ];

  async function Form() {
    let categories: Category[] = [];

    const categoriesResponse = await getMany();
    if (!categoriesResponse.success) {
      alert("Error al cargar las categorías");
    } else {
      categories = categoriesResponse.data;
    }

    return <ProductForm categories={categories} />;
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-5">
        <BreadCrumb items={breadcrumbItems} />
        <Form />
      </div>
    </ScrollArea>
  );
}
