import { createFileRoute } from "@tanstack/react-router";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { CandidateError } from "@/features/candidates/CandidateError";
import { WorkDetailPage } from "@/features/execution/WorkDetail";
import { execQuery } from "@/features/execution/queries";

export const Route = createFileRoute("/_authenticated/app/projects/$id")({
  beforeLoad: requirePermission("project.view"),
  head: () => candidateHead("Projects — Record", "Candidate project execution and review."),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(execQuery("PROJECT", params.id)),
  errorComponent: CandidateError,
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <WorkDetailPage kind="PROJECT" id={id} />;
}
