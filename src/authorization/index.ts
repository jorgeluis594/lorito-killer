export type {
  UserRole,
  Resource,
  Action,
  PermissionMap,
} from "./types";
export { USER_ROLES, RESOURCES, ACTIONS, ROLE_LABELS } from "./types";

export { permissions } from "./permissions";

export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
} from "./helpers";

export type { AuthorizedUser } from "./server";
export {
  requirePermission,
  requireRole,
  protectedAction,
  protectedRoute,
  getAuthorizedUser,
} from "./server";

export {
  usePermission,
  useHasRole,
  useUserRole,
  Can,
  HasRole,
} from "./client";
