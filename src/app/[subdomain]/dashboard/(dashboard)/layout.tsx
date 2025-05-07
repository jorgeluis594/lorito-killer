import Header from "@/shared/components/layout/header";
import Sidebar from "@/shared/components/layout/sidebar";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import {ScrollArea} from "@/shared/components/ui/scroll-area";
import {MobileSidebar} from "@/shared/components/layout/mobile-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header/>
      <div className="flex h-screen overflow-hidden">
        <div className="hidden md:flex md:w-[234px]">
          <Sidebar/>
        </div>
        <div className="md:hidden fixed top-4 left-4 z-50">
          <MobileSidebar/>
        </div>
        <main className="w-full pt-14">
          <ScrollArea className="h-full">
            <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)}/>
            {children}
          </ScrollArea>
        </main>
      </div>
    </>
  );
}
