import BreadCrumb from "@/shared/breadcrumb";
import ListProducts from "@/product/components/list-product";
import { ProductFormStoreProvider } from "@/product/components/form/product-form-store-provider";

const breadcrumbItems = [{ title: "Productos", link: "/products" }];

export default async function Page() {
  return (
    <ProductFormStoreProvider>
      <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
        <BreadCrumb items={breadcrumbItems} />
        <ListProducts />
      </div>
    </ProductFormStoreProvider>
  );
}
