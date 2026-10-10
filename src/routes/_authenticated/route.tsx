import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { currentUserQuery } from "@/lib/auth/current-user";
import { isSignInAllowed } from "@/lib/rbac/permissions";
import { FullPageLoader } from "@/components/app/shared";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const user = await context.queryClient.ensureQueryData(currentUserQuery);
    if (!user || !isSignInAllowed(user.status) || !user.role_key) {
      await supabase.auth.signOut();
      throw redirect({ to: "/login" });
    }
    return { user };
  },
  pendingComponent: FullPageLoader,
  component: () => <Outlet />,
});
