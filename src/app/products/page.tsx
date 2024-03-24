import BreadCrumb from "@/components/breadcrumb";
import ProductsClient from "@/components/tables/products/client";
import { getMany as getManyProducts } from "@/product/db_repository";
import { Suspense } from "react";

const breadcrumbItems = [{ title: "Productos", link: "/products" }];

const Products = async () => {
  const response = await getManyProducts();

  if (!response.success) {
    return <div>Error: {response.message}</div>;
  }

  return <ProductsClient data={response.data} />;
};

export default async function Page() {
  const response = await getManyProducts();

  return (
    <>
      <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
        <BreadCrumb items={breadcrumbItems} />
        <Suspense fallback={<p>Loading</p>}>
          <Products />
        </Suspense>
      </div>
    </>
  );
}
