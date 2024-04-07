import { OrderFormProvider } from "@/components/forms/order-form/order-form-provider";
import { CategoryStoreProvider } from "@/category/components/category-store-provider";
import CategoriesLoader from "@/category/components/categories-loader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrderFormProvider>
      <CategoryStoreProvider>
        <CategoriesLoader>{children}</CategoriesLoader>
      </CategoryStoreProvider>
    </OrderFormProvider>
  );
}
