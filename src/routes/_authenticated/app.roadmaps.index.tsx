import { createFileRoute } from "@tanstack/react-router";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { RoadmapListPage } from "@/features/roadmaps/RoadmapList";
import { roadmapListQuery } from "@/features/roadmaps/queries";

export const Route = createFileRoute("/_authenticated/app/roadmaps/")({
  beforeLoad: requirePermission("roadmap.view"),
  head: () => candidateHead("Roadmaps", "Candidate roadmap execution, progress and schedule health."),
  loader: ({ context }) => context.queryClient.ensureQueryData(roadmapListQuery),
  component: RoadmapListPage,
});
