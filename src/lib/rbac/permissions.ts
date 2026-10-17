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
  candidatesCreate: "candidates.create",
  candidatesEdit: "candidates.edit",
  candidatesStatus: "candidates.status",
  candidatesAssign: "candidates.assign",
  candidatesPortal: "candidates.portal",
  candidatesViewAll: "candidates.view_all",
  candidatesViewAssigned: "candidates.view_assigned",
  assessmentView: "assessment.view",
  assessmentCreate: "assessment.create",
  assessmentEdit: "assessment.edit",
  assessmentComplete: "assessment.complete",
  assessmentFinalize: "assessment.finalize",
  assessmentReassess: "assessment.reassess",
  assessmentDocuments: "assessment.documents",
  assessmentViewInternal: "assessment.view_internal",
  pcbView: "pcb.view",
  tracksView: "tracks.view",
  tracksCreate: "tracks.create",
  tracksEdit: "tracks.edit",
  tracksVersion: "tracks.version",
  tracksActivate: "tracks.activate",
  tracksArchive: "tracks.archive",
  trackContentView: "track_content.view",
  trackContentEdit: "track_content.edit",
  globalContentView: "global_pcb_content.view",
  globalContentEdit: "global_pcb_content.edit",
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
