import { cn } from "@/lib/utils";
import { MobileSidebar } from "./mobile-sidebar";
import { UserNav } from "./user-nav";
import {LogoImage} from "@/shared/components/layout/logo";

export default async function Header() {
  return (
    <div className="fixed top-0 left-0 right-0 supports-backdrop-blur:bg-background/60 border-b bg-background/95 backdrop-blur z-20">
      <nav className="h-14 flex items-center justify-between px-4">
        <div className={cn("block lg:!hidden")}>
          <MobileSidebar/>
        </div>
        <div className="flex items-center justify-center relative w-[56px] h-[56px] rounded-md overflow-hidden ml-20">
          <LogoImage/>
        </div>
        <div className="flex items-center justify-end w-full">
          <UserNav/>
        </div>
      </nav>
    </div>
  );
}
