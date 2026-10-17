import { createFileRoute } from "@tanstack/react-router";
import { CandidateError } from "@/features/candidates/CandidateError";
import { detailQuery } from "@/features/candidates/queries";
import { assessmentQuery } from "@/features/assessments/queries";
import { AssessmentEditor } from "@/features/assessments/AssessmentEditor";
import { candidateHead } from "@/lib/candidates/head";

export const Route = createFileRoute("/_authenticated/app/candidates/$id_/assessments/$aid")({
  head: () =>
    candidateHead("Career Assessment", "Record and finalize a manual career assessment in CareerOS."),
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(assessmentQuery(params.aid)),
      context.queryClient.ensureQueryData(detailQuery(params.id)),
    ]),
  errorComponent: CandidateError,
  component: Page,
});
function Page() {
  const { id, aid } = Route.useParams();
  return <AssessmentEditor key={aid} candidateId={id} id={aid} />;
}
