import { candidateHead } from "@/lib/candidates/head";
import { createFileRoute } from "@tanstack/react-router";
import { UsersPage } from "@/features/users/UsersPage";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export const Route = createFileRoute("/_authenticated/app/users")({
  beforeLoad: requirePermission(PERMISSIONS.usersView),
  head: () => candidateHead("Users", "Manage staff and candidate login accounts in CareerOS."),
  component: UsersPage,
});
