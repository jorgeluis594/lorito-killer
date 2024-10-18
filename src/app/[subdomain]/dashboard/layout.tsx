import {OrderFormProvider} from "@/new-order/order-form-provider";
import {CategoryStoreProvider} from "@/category/components/category-store-provider";
import {CashShiftStoreProvider} from "@/cash-shift/components/cash-shift-store-provider";
import CategoriesLoader from "@/category/components/categories-loader";
import {CompanyProvider} from "@/lib/use-company";
import React from "react";
import {getSession} from "@/lib/auth";
import {getCompany} from "@/company/db_repository";
import SignOutRedirection from "@/shared/components/sign-out-redirection";
import {ProductFormProvider} from "@/new-order/components/products-view/product-searcher-form-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) return;

  const companyResponse = await getCompany(session.user.companyId);
  if (!companyResponse.success) {
    return <SignOutRedirection />
  }

  return (
    <CompanyProvider company={companyResponse.data}>
    <OrderFormProvider>
      <ProductFormProvider>
        <CategoryStoreProvider>
          <CashShiftStoreProvider>
            <CategoriesLoader>{children}</CategoriesLoader>
          </CashShiftStoreProvider>
        </CategoryStoreProvider>
      </ProductFormProvider>
    </OrderFormProvider>
    </CompanyProvider>
  );
}
