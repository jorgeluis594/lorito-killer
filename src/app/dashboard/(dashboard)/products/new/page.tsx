import BreadCrumb from "@/components/breadcrumb";
import { ProductForm } from "@/components/forms/product-form/product-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";

export default async function Page() {
  const breadcrumbItems = [
    { title: "Productos", link: "/products" },
    { title: "Registro", link: "/products/new" },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-5">
        <BreadCrumb items={breadcrumbItems} />
        <ProductForm />;
      </div>
    </ScrollArea>
  );
}
