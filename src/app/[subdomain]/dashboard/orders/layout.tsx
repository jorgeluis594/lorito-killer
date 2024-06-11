import Header from "@/shared/components/layout/header";
import Sidebar from "@/shared/components/layout/sidebar";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import { OrderFormProvider } from "@/new-order/order-form-provider";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MobileSidebar } from "@/shared/components/layout/mobile-sidebar";
import { UserNav } from "@/shared/components/layout/user-nav";

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed top-0 left-0 right-0 supports-backdrop-blur:bg-background/60 border-b bg-background/95 backdrop-blur z-20">
        <nav className="h-14 flex items-center justify-between px-4">
          <div className={cn("block")}>
            <MobileSidebar />
          </div>

          <div className="flex items-center gap-2">
            <UserNav />
          </div>
        </nav>
      </div>
      <div className="flex h-screen overflow-hidden">
        <main className="w-full pt-14">
          <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
          {children}
        </main>
      </div>
    </>
  );
}
