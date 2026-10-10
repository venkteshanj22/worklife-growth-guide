import { redirect } from "@tanstack/react-router";
import { can, type CurrentUser } from "@/lib/rbac/permissions";

/** Route beforeLoad guard: redirects to Access Denied unless the user holds the permission. */
export function requirePermission(key: string) {
  return ({ context }: { context: { user: CurrentUser } }) => {
    if (!can(context.user, key)) throw redirect({ to: "/access-denied" });
  };
}
