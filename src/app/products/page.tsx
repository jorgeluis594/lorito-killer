import BreadCrumb from "@/components/breadcrumb";
import { getMany as getManyProducts } from "@/product/db_repository";
import ListProducts from "@/components/product/list-product";

const breadcrumbItems = [{ title: "Productos", link: "/products" }];

export default async function Page() {
  const response = await getManyProducts();

  return (
    <>
      <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
        <BreadCrumb items={breadcrumbItems} />
        <ListProducts />
      </div>
    </>
  );
}
