import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHeader } from "@/components/app/shared";
import { SOON_LABELS } from "@/lib/rbac/nav";

export const Route = createFileRoute("/_authenticated/app/soon/$section")({
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
