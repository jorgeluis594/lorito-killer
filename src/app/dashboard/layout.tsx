import {OrderFormProvider} from "@/new-order/order-form-provider";
import {CategoryStoreProvider} from "@/category/components/category-store-provider";
import {CashShiftStoreProvider} from "@/cash-shift/components/cash-shift-store-provider";
import CategoriesLoader from "@/category/components/categories-loader";
import {ProductsStoreProvider} from "@/product/components/products-store-provider";
import {AdvertenceModal} from "@/shared/components/modal/advertence-modal";
import {LogoStoreProvider} from "@/company/logo-store-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrderFormProvider>
      <LogoStoreProvider>
        <CategoryStoreProvider>
          <ProductsStoreProvider>
            <CashShiftStoreProvider>
              <CategoriesLoader>{children}</CategoriesLoader>
            </CashShiftStoreProvider>
          </ProductsStoreProvider>
        </CategoryStoreProvider>
      </LogoStoreProvider>
    </OrderFormProvider>
  );
}
