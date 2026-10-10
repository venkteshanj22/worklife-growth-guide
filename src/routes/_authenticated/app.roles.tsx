import { createFileRoute } from "@tanstack/react-router";
import { RolesPage } from "@/features/roles/RolesPage";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export const Route = createFileRoute("/_authenticated/app/roles")({
  beforeLoad: requirePermission(PERMISSIONS.rolesView),
  head: () => ({ meta: [{ title: "Roles & Permissions — CareerOS" }] }),
  component: RolesPage,
});
