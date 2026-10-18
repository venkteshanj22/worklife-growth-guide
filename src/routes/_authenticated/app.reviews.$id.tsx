import { createFileRoute } from "@tanstack/react-router";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { CandidateError } from "@/features/candidates/CandidateError";
import { ReviewDetailPage } from "@/features/execution/ReviewDetail";
import { execQuery } from "@/features/execution/queries";

export const Route = createFileRoute("/_authenticated/app/reviews/$id")({
  beforeLoad: requirePermission("weekly_review.view"),
  head: () => candidateHead("Weekly Reviews — Record", "Consultant-led weekly progress reviews."),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(execQuery("REVIEW", params.id)),
  errorComponent: CandidateError,
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <ReviewDetailPage id={id} />;
}
