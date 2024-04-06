import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import { OrderFormProvider } from "@/components/forms/order-form/order-form-provider";
import { CategoryStoreProvider } from "@/category/components/category-store-provider";
import CategoriesLoader from "@/category/components/categories-loader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <OrderFormProvider>
        <CategoryStoreProvider>
          <Header />
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="w-full pt-14">
              <NextSSRPlugin
                routerConfig={extractRouterConfig(ourFileRouter)}
              />
              <CategoriesLoader>{children}</CategoriesLoader>
            </main>
          </div>
        </CategoryStoreProvider>
      </OrderFormProvider>
    </>
  );
}
