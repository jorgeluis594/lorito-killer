import BreadCrumb from "@/components/breadcrumb";
import { ProductForm } from "@/components/forms/product-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";

export default function Page() {
  const breadcrumbItems = [
    { title: "Productos", link: "/dashboard/products" },
    { title: "Registro", link: "/dashboard/products/new" },
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
          initialData={null}
        />
      </div>
    </ScrollArea>
  );
}
