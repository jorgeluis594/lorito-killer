import Header from "@/shared/components/layout/header";
import Sidebar from "@/shared/components/layout/sidebar";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import {Separator} from "@/shared/components/ui/separator";
import UserForm from "@/user/components/user-form";
import ChangePasswordForm from "@/user/components/change-password-form";
import {ScrollArea} from "@/shared/components/ui/scroll-area";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="w-full pt-14">
          <ScrollArea className="h-full">
            <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
            {children}
          </ScrollArea>
        </main>
      </div>
    </>
  );
}
