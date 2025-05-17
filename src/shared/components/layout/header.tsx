import { cn } from "@/lib/utils";
import { MobileSidebar } from "./mobile-sidebar";
import { UserNav } from "./user-nav";
import {LogoImage} from "@/shared/components/layout/logo";

export default function Header() {
  return (
    <div className="fixed top-0 left-0 right-0 supports-backdrop-blur:bg-background/60 border-b bg-background/95 backdrop-blur z-20">
      <nav className="h-14 flex items-center justify-between px-4">
        <div className="flex items-center">
          <div className={cn("block lg:!hidden")}>
            <MobileSidebar/>
          </div>
          <div className="flex relative w-[150px] h-[56px] rounded-md overflow-hidden ml-2">
            <LogoImage/>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UserNav/>
        </div>
      </nav>
    </div>
  );
}
