import { OrderFormProvider } from "@/new-order/order-form-provider";
import { CategoryStoreProvider } from "@/category/components/category-store-provider";
import { CashShiftProvider } from "@/cash-shift/components/cash-shift-provider";
import CategoriesLoader from "@/category/components/categories-loader";
import { CompanyProvider } from "@/lib/use-company";
import React from "react";
import { getSession } from "@/lib/auth";
import { getCompany } from "@/company/db_repository";
import SignOutRedirection from "@/shared/components/sign-out-redirection";
import { ProductFormProvider } from "@/new-order/components/products-view/product-searcher-form-provider";
import { getLastOpenCashShift, userExists } from "@/cash-shift/db_repository";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.user) return <SignOutRedirection />;

  const [cashShiftResponse, userPresent, companyResponse] = await Promise.all([
    getLastOpenCashShift(session.user.id),
    // this is used to log out the user if it doesn't exist, the logout is done in the CashShiftProvider
    userExists(session.user.id),
    getCompany(session.user.companyId),
  ]);
  if (!companyResponse.success) {
    return <SignOutRedirection />;
  }

  return (
    <CompanyProvider company={companyResponse.data}>
      <OrderFormProvider>
        <ProductFormProvider>
          <CategoryStoreProvider>
            <CashShiftProvider
              cashShiftResponse={
                userPresent
                  ? cashShiftResponse
                  : {
                      success: false,
                      message: "Usuario no autenticado",
                      type: "AuthError",
                    }
              }
            >
              <CategoriesLoader>{children}</CategoriesLoader>
            </CashShiftProvider>
          </CategoryStoreProvider>
        </ProductFormProvider>
      </OrderFormProvider>
    </CompanyProvider>
  );
}
