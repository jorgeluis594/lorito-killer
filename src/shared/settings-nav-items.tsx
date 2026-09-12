"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useFeatureEnabled } from "@/feature-flags/client";

const items = [
  { title: "Perfil", href: "/dashboard/settings" },
  { title: "Empresa", href: "/dashboard/settings/company" },
  { title: "Features", href: "/dashboard/settings/features" },
  { title: "Sellers", href: "/dashboard/settings/sellers" },
];

export default function NavItems({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const restaurantsEnabled = useFeatureEnabled("restaurants");
  const visibleItems =
    isAdmin && restaurantsEnabled
      ? [...items, { title: "Mesas", href: "/dashboard/tables/configure" }]
      : items;

  return (
    <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
      {visibleItems.map((item) => {
        return (
          item.href && (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  path === item.href ? "bg-accent" : "transparent",
                )}
              >
                <span>{item.title}</span>
              </span>
            </Link>
          )
        );
      })}
    </nav>
  );
}
