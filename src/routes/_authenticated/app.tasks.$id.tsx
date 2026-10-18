import { createFileRoute } from "@tanstack/react-router";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { CandidateError } from "@/features/candidates/CandidateError";
import { WorkDetailPage } from "@/features/execution/WorkDetail";
import { execQuery } from "@/features/execution/queries";

export const Route = createFileRoute("/_authenticated/app/tasks/$id")({
  beforeLoad: requirePermission("premium_task.view"),
  head: () => candidateHead("Premium Tasks — Record", "Premium candidate task assignments and review."),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(execQuery("TASK", params.id)),
  errorComponent: CandidateError,
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <WorkDetailPage kind="TASK" id={id} />;
}
