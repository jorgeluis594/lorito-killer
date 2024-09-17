import {OrderFormProvider} from "@/new-order/order-form-provider";
import {CategoryStoreProvider} from "@/category/components/category-store-provider";
import {CashShiftStoreProvider} from "@/cash-shift/components/cash-shift-store-provider";
import CategoriesLoader from "@/category/components/categories-loader";
import {ProductFormProvider} from "@/new-order/components/products-view/product-searcher-form-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrderFormProvider>
      <ProductFormProvider>
        <CategoryStoreProvider>
          <CashShiftStoreProvider>
            <CategoriesLoader>{children}</CategoriesLoader>
          </CashShiftStoreProvider>
        </CategoryStoreProvider>
      </ProductFormProvider>
    </OrderFormProvider>
  );
}
