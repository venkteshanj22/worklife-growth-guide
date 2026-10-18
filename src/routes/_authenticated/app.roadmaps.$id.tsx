import { createFileRoute, Link } from "@tanstack/react-router";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { Panel } from "@/components/app/shared";
import { RoadmapDetailPage } from "@/features/roadmaps/RoadmapDetail";
import { roadmapQuery } from "@/features/roadmaps/queries";

export const Route = createFileRoute("/_authenticated/app/roadmaps/$id")({
  beforeLoad: requirePermission("roadmap.view"),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(roadmapQuery(params.id)),
  head: () => candidateHead("Roadmap", "Candidate roadmap overview, daily execution, resources and progress."),
  errorComponent: () => (
    <Panel className="p-8 text-center">
      <p className="font-medium">Roadmap not found or access denied.</p>
      <Link to="/app/roadmaps" className="mt-2 inline-block text-sm text-primary hover:underline">Back to Roadmaps</Link>
    </Panel>
  ),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <RoadmapDetailPage id={id} />;
}
