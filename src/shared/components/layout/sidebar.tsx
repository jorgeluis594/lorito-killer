"use client";

import { DashboardNav } from "@/shared/dashboard-nav";
import { navItems } from "@/constants/data";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/authorization/client";
import { ROLE_LABELS } from "@/authorization/types";

export default function Sidebar() {
  const role = useUserRole();
  const label = role ? ROLE_LABELS[role] : "";

  return (
    <nav
      className={cn(`relative hidden h-screen border-r pt-16 lg:block w-72`)}
    >
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            <h2 className="mb-2 px-4 text-xl font-semibold tracking-tight">
              {label}
            </h2>
            <DashboardNav items={navItems} />
          </div>
        </div>
      </div>
    </nav>
  );
}
