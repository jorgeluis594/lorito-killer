import BreadCrumb from "@/components/breadcrumb";
import ProductsClient from "@/components/tables/products/client";
import Product from "@/product/model";

const breadcrumbItems = [{ title: "User", link: "/dashboard/user" }];
export default async function Page() {
  const response = await Product.list()

  return (
    <>
      <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
        <BreadCrumb items={breadcrumbItems} />
        <ProductsClient data={response.data || []} />
      </div>
    </>
  );
}
