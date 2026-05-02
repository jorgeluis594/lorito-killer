import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { hasPermission } from "@/authorization/helpers";
import type { UserRole, Resource, Action } from "@/authorization/types";

export const config = {
  matcher: [
    "/",
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).+)",
    "/dashboard/:path*",
  ],
};

type RoutePermission = { resource: Resource; action: Action };

const routePermissions: Array<{ path: string; permission: RoutePermission }> = [
  {
    path: "/dashboard/orders/new",
    permission: { resource: "orders", action: "create" },
  },
  {
    path: "/dashboard/orders",
    permission: { resource: "orders", action: "read" },
  },
  {
    path: "/dashboard/products",
    permission: { resource: "products", action: "create" },
  },
  {
    path: "/dashboard/sales_reports",
    permission: { resource: "reports", action: "read" },
  },
  {
    path: "/dashboard/cash_shifts",
    permission: { resource: "cash_shifts", action: "read" },
  },
  {
    path: "/dashboard/stock_adjustments",
    permission: { resource: "stock", action: "read" },
  },
  {
    path: "/dashboard/settings",
    permission: { resource: "company", action: "read" },
  },
];

function getDefaultRoute(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "/dashboard";
    case "CASHIER":
    case "WAITER":
      return "/dashboard/orders/new";
    default:
      return "/login";
  }
}

function getRoutePermission(pathname: string): RoutePermission | null {
  // Check most specific routes first (longer paths first)
  for (const route of routePermissions) {
    if (pathname === route.path || pathname.startsWith(route.path + "/")) {
      return route.permission;
    }
  }

  // /dashboard exact path - only ADMIN (reports overview)
  if (pathname === "/dashboard") {
    return { resource: "reports", action: "read" };
  }

  return null;
}

export default async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const isMaintenancePage =
    url.pathname === "/maintenance" || url.pathname.startsWith("/maintenance/");
  const isMaintenanceMode =
    process.env.MAINTENANCE_MODE?.toLowerCase() === "true";

  if (isMaintenanceMode) {
    if (isMaintenancePage) {
      return NextResponse.next();
    }

    return NextResponse.rewrite(new URL("/maintenance", req.url));
  }

  if (isMaintenancePage) {
    return NextResponse.next();
  }

  const hostname = req.headers.get("host")!;

  const subdomain =
    process.env.PREVIEW === "true" ? "fantastidog" : hostname.split(".")[0];

  const token = await getToken({ req });

  if (
    !token &&
    url.pathname.startsWith("/dashboard") &&
    !url.pathname.startsWith("/login")
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Route protection for dashboard pages
  if (token && url.pathname.startsWith("/dashboard")) {
    const role = token.role as UserRole | undefined;

    // Block inactive users
    if (token.active === false) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (role) {
      const permission = getRoutePermission(url.pathname);
      if (permission && !hasPermission(role, permission.resource, permission.action)) {
        const defaultRoute = getDefaultRoute(role);
        if (defaultRoute === "/login") {
          return NextResponse.redirect(new URL("/login", req.url));
        }
        return NextResponse.redirect(new URL(defaultRoute, req.url));
      }
    }
  }

  return NextResponse.rewrite(
    new URL(
      `/${subdomain}${url.pathname}?${url.searchParams.toString()}`,
      req.url,
    ),
  );
}
