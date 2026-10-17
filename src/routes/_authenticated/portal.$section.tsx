import { candidateHead } from "@/lib/candidates/head";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { ComingSoon } from "@/components/app/shared";
import { PORTAL_NAV } from "@/lib/rbac/nav";

export const Route = createFileRoute("/_authenticated/portal/$section")({
  beforeLoad: ({ params }) => {
    if (!PORTAL_NAV.some((n) => n.slug === params.section)) throw notFound();
  },
  head: ({ params }) => candidateHead(`${PORTAL_NAV.find(n => n.slug === params.section)?.label ?? "Candidate Module"} — Coming Soon`, "This CareerOS candidate portal module will be activated in a future phase."),
  component: PortalSoon,
});

function PortalSoon() {
  const { section } = Route.useParams();
  const item = PORTAL_NAV.find((n) => n.slug === section);
  return <ComingSoon title={item?.label ?? "Coming soon"} homeTo="/portal" />;
}
