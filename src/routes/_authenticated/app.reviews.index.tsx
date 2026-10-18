import { createFileRoute } from "@tanstack/react-router";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { ExecListPage } from "@/features/execution/ExecList";
import { execListQuery } from "@/features/execution/queries";

export const Route = createFileRoute("/_authenticated/app/reviews/")({
  beforeLoad: requirePermission("weekly_review.view"),
  head: () => candidateHead("Weekly Reviews", "Consultant-led weekly progress reviews."),
  loader: ({ context }) => context.queryClient.ensureQueryData(execListQuery("REVIEW")),
  component: Page,
});
function Page() {
  return <ExecListPage kind="REVIEW" />;
}
