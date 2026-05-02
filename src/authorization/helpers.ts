import type { UserRole, Resource, Action } from "./types";
import { permissions } from "./permissions";

export function hasPermission(
  role: UserRole,
  resource: Resource,
  action: Action,
): boolean {
  const rolePerms = permissions[role];
  if (!rolePerms) return false;

  const resourceActions = rolePerms[resource as keyof typeof rolePerms];
  if (!resourceActions) return false;

  return (resourceActions as readonly string[]).includes(action);
}

export function hasAnyPermission(
  role: UserRole,
  checks: Array<{ resource: Resource; action: Action }>,
): boolean {
  return checks.some((c) => hasPermission(role, c.resource, c.action));
}

export function hasAllPermissions(
  role: UserRole,
  checks: Array<{ resource: Resource; action: Action }>,
): boolean {
  return checks.every((c) => hasPermission(role, c.resource, c.action));
}

export function getRolePermissions(
  role: UserRole,
): Array<{ resource: Resource; action: Action }> {
  const rolePerms = permissions[role];
  if (!rolePerms) return [];

  const result: Array<{ resource: Resource; action: Action }> = [];
  for (const [resource, actions] of Object.entries(rolePerms)) {
    for (const action of actions as readonly string[]) {
      result.push({
        resource: resource as Resource,
        action: action as Action,
      });
    }
  }
  return result;
}
