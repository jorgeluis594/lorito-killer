"use client";

import { useUserSession } from "@/lib/use-user-session";
import type { UserRole, Resource, Action } from "./types";
import { hasPermission } from "./helpers";
import type { ReactNode } from "react";

export function usePermission(resource: Resource, action: Action): boolean {
  const user = useUserSession();
  if (!user?.role) return false;
  return hasPermission(user.role, resource, action);
}

export function useHasRole(...roles: UserRole[]): boolean {
  const user = useUserSession();
  if (!user?.role) return false;
  return roles.includes(user.role);
}

export function useUserRole(): UserRole | null {
  const user = useUserSession();
  return user?.role ?? null;
}

export function Can({
  resource,
  action,
  children,
  fallback = null,
}: {
  resource: Resource;
  action: Action;
  children: ReactNode;
  fallback?: ReactNode;
}): ReactNode {
  const allowed = usePermission(resource, action);
  return allowed ? children : fallback;
}

export function HasRole({
  roles,
  children,
  fallback = null,
}: {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}): ReactNode {
  const user = useUserSession();
  if (!user?.role) return fallback;
  return roles.includes(user.role) ? children : fallback;
}
