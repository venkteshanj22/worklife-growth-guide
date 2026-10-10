import { useSuspenseQuery } from "@tanstack/react-query";
import { currentUserQuery } from "./current-user";
import { can } from "@/lib/rbac/permissions";
import type { CurrentUser } from "@/lib/rbac/permissions";

/** Only use under routes whose beforeLoad already ensured an active user. */
export function useCurrentUser() {
  const { data } = useSuspenseQuery(currentUserQuery);
  const user = data as CurrentUser;
  return { user, can: (key: string) => can(user, key) };
}
