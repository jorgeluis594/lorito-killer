import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import { OrderFormProvider } from "@/components/forms/order-form/order-form-provider";
import { CategoryStoreProvider } from "@/category/components/category-store-provider";
import { getMany } from "@/category/db_respository";
import { Category } from "@/category/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categoriesResponse = await getMany();
  let categories: Category[] = [];
  if (categoriesResponse.success) {
    categories = categoriesResponse.data;
  } else {
    console.error(categoriesResponse.message);
  }

  return (
    <>
      <OrderFormProvider>
        <CategoryStoreProvider initialCategories={categories}>
          <Header />
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="w-full pt-14">
              <NextSSRPlugin
                routerConfig={extractRouterConfig(ourFileRouter)}
              />
              {children}
            </main>
          </div>
        </CategoryStoreProvider>
      </OrderFormProvider>
    </>
  );
}
