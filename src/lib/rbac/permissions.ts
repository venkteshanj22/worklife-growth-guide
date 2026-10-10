// Permission keys follow module.resource.action. Keep in sync with the `permissions` table seed.
export const PERMISSIONS = {
  dashboardView: "dashboard.view",
  usersView: "users.view",
  usersCreate: "users.create",
  usersEdit: "users.edit",
  usersStatus: "users.status",
  rolesView: "roles.view",
  rolesCreate: "roles.create",
  rolesEdit: "roles.edit",
  rolesPermissions: "roles.permissions",
  auditView: "audit.view",
  settingsView: "settings.view",
  settingsEdit: "settings.edit",
  candidateSelfView: "candidate.self.view",
  candidatesView: "candidates.view",
  pcbView: "pcb.view",
  deliveryView: "delivery.view",
  placementView: "placement.view",
  documentsView: "documents.view",
  financeView: "finance.view",
  reportsView: "reports.view",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const SUPER_ADMIN_ROLE = "super_admin";
export const CANDIDATE_ROLE = "candidate";

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface CurrentUser {
  id: string;
  full_name: string;
  user_code: string;
  email: string;
  status: UserStatus;
  role_key: string | null;
  role_name: string | null;
  is_staff: boolean;
  permissions: string[];
}

/** Mirrors the database `has_permission` rule for UI decisions. The database remains the authority. */
export function can(user: Pick<CurrentUser, "status" | "role_key" | "permissions"> | null | undefined, key: string): boolean {
  if (!user || user.status !== "ACTIVE" || !user.role_key) return false;
  if (user.role_key === SUPER_ADMIN_ROLE) return true;
  return user.permissions.includes(key);
}

export function canAny(user: Parameters<typeof can>[0], keys: string[]): boolean {
  return keys.some((k) => can(user, k));
}

export function isSignInAllowed(status: UserStatus | null | undefined): boolean {
  return status === "ACTIVE";
}

export function homePathFor(user: Pick<CurrentUser, "is_staff"> | null | undefined): "/app/dashboard" | "/portal" {
  return user?.is_staff ? "/app/dashboard" : "/portal";
}
