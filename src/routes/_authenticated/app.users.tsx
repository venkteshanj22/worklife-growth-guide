import { createFileRoute } from "@tanstack/react-router";
import { UsersPage } from "@/features/users/UsersPage";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export const Route = createFileRoute("/_authenticated/app/users")({
  beforeLoad: requirePermission(PERMISSIONS.usersView),
  head: () => ({ meta: [{ title: "Users — CareerOS" }] }),
  component: UsersPage,
});
