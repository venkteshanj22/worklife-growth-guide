import { createFileRoute, redirect } from "@tanstack/react-router";
import { FullPageLoader } from "@/components/app/shared";
import { supabase } from "@/integrations/supabase/client";
import { currentUserQuery } from "@/lib/auth/current-user";
import { homePathFor, isSignInAllowed } from "@/lib/rbac/permissions";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "CareerOS — Career Journey Management Platform" },
      { name: "description", content: "CareerOS by Coding361: manage every candidate's career journey." },
      { property: "og:title", content: "CareerOS — Career Journey Management Platform" },
      { property: "og:description", content: "CareerOS by Coding361: manage every candidate's career journey." },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    const user = await context.queryClient.fetchQuery(currentUserQuery);
    if (!user || !isSignInAllowed(user.status)) throw redirect({ to: "/login" });
    throw redirect({ to: homePathFor(user) });
  },
  component: FullPageLoader,
});
