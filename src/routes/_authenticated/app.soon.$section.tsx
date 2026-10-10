import { createFileRoute, redirect } from "@tanstack/react-router";
import { can } from "@/lib/rbac/permissions";
import { ComingSoon, PageHeader } from "@/components/app/shared";
import { SOON_LABELS, SOON_PERMISSIONS } from "@/lib/rbac/nav";

export const Route = createFileRoute("/_authenticated/app/soon/$section")({
  beforeLoad: ({ context, params }) => {
    const perm = SOON_PERMISSIONS[params.section];
    if (!perm || !can(context.user, perm)) throw redirect({ to: "/access-denied" });
  },
  head: () => ({ meta: [{ title: "Coming soon — CareerOS" }] }),
  component: SoonPage,
});

function SoonPage() {
  const { section } = Route.useParams();
  const label = SOON_LABELS[section] ?? "Module";
  return (
    <>
      <PageHeader crumbs={["CareerOS", ...label.split(" · ")]} title={label.split(" · ").at(-1)!} />
      <ComingSoon title={label} homeTo="/app/dashboard" />
    </>
  );
}
