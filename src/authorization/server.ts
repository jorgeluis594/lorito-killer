import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Resource, Action, UserRole } from "./types";
import { hasPermission } from "./helpers";
import type { response } from "@/lib/types";

export type AuthorizedUser = {
  id: string;
  name: string;
  email: string;
  companyId: string;
  role: UserRole;
  active: boolean;
};

type PermissionGuard = { resource: Resource; action: Action };
type RoleGuard = { roles: UserRole[] };
type Guard = PermissionGuard | RoleGuard;

export async function getAuthorizedUser(): Promise<response<AuthorizedUser>> {
  const session = await getSession();

  if (!session?.user) {
    return {
      success: false,
      message: "No autenticado",
      type: "AuthError",
    };
  }

  if (!session.user.active) {
    return {
      success: false,
      message: "Tu cuenta esta desactivada. Contacta a tu administrador.",
      type: "AuthError",
    };
  }

  return { success: true, data: session.user as AuthorizedUser };
}

export async function requirePermission(
  resource: Resource,
  action: Action,
): Promise<response<AuthorizedUser>> {
  const userResponse = await getAuthorizedUser();
  if (!userResponse.success) return userResponse;

  const user = userResponse.data;
  if (!hasPermission(user.role, resource, action)) {
    return {
      success: false,
      message: "No tienes permiso para realizar esta accion",
      type: "AuthorizationError",
    };
  }

  return { success: true, data: user };
}

export async function requireRole(
  ...roles: UserRole[]
): Promise<response<AuthorizedUser>> {
  const userResponse = await getAuthorizedUser();
  if (!userResponse.success) return userResponse;

  const user = userResponse.data;
  if (!roles.includes(user.role)) {
    return {
      success: false,
      message: "No tienes permiso para realizar esta accion",
      type: "AuthorizationError",
    };
  }

  return { success: true, data: user };
}

async function resolveGuard(guard: Guard): Promise<response<AuthorizedUser>> {
  if ("roles" in guard) {
    return requireRole(...guard.roles);
  }
  return requirePermission(guard.resource, guard.action);
}

export function protectedAction<TArgs extends unknown[], TResult>(
  guard: Guard,
  fn: (user: AuthorizedUser, ...args: TArgs) => Promise<response<TResult>>,
): (...args: TArgs) => Promise<response<TResult>> {
  return async (...args: TArgs): Promise<response<TResult>> => {
    const auth = await resolveGuard(guard);
    if (!auth.success) return auth;
    return fn(auth.data, ...args);
  };
}

export function protectedRoute(
  guard: Guard,
  handler: (req: Request, user: AuthorizedUser) => Promise<NextResponse>,
): (req: Request) => Promise<NextResponse> {
  return async (req: Request): Promise<NextResponse> => {
    const auth = await resolveGuard(guard);
    if (!auth.success) {
      const status = auth.type === "AuthError" ? 401 : 403;
      return NextResponse.json(
        { success: false, message: auth.message },
        { status },
      );
    }
    return handler(req, auth.data);
  };
}
