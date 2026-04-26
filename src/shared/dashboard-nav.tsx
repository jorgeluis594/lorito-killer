"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icons } from "@/shared/icons";
import { cn } from "@/lib/utils";
import { NavItem } from "@/ui/types";
import { Dispatch, SetStateAction } from "react";
import { usePermission } from "@/authorization/client";
import { useOptionalFeatureEnabled } from "@/feature-flags/client";

function NavLink({
  item,
  path,
  setOpen,
}: {
  item: NavItem;
  path: string;
  setOpen?: Dispatch<SetStateAction<boolean>>;
}) {
  const featureEnabled = useOptionalFeatureEnabled(item.feature);
  const allowed = usePermission(
    item.permission?.resource ?? "orders",
    item.permission?.action ?? "read",
  );

  if (!featureEnabled || !allowed) return null;

  const Icon = Icons[item.icon || "arrowRight"];

  return (
    <Link
      href={item.disabled ? "/" : item.href!}
      onClick={() => {
        if (setOpen) setOpen(false);
      }}
    >
      <span
        className={cn(
          "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          path === item.href ? "bg-accent" : "transparent",
          item.disabled && "cursor-not-allowed opacity-80",
        )}
      >
        <Icon className="mr-2 h-4 w-4" />
        <span>{item.title}</span>
      </span>
    </Link>
  );
}

interface DashboardNavProps {
  items: NavItem[];
  setOpen?: Dispatch<SetStateAction<boolean>>;
}

export function DashboardNav({ items, setOpen }: DashboardNavProps) {
  const path = usePathname();

  if (!items?.length) {
    return null;
  }

  return (
    <nav className="grid items-start gap-2">
      {items.map((item, index) =>
        item.href ? (
          <NavLink key={index} item={item} path={path} setOpen={setOpen} />
        ) : null,
      )}
    </nav>
  );
}
